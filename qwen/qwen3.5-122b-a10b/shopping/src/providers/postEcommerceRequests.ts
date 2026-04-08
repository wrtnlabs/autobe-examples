import { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import { IEcommerceAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminRequest";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceAdminRequestCollector } from "../collectors/EcommerceAdminRequestCollector";
import { EcommerceAdminRequestTransformer } from "../transformers/EcommerceAdminRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceRequests(props: {
  body: IEcommerceAdminRequest.ICreate;
}): Promise<IEcommerceAdminRequest> {
  // Determine requester type by querying customer and seller tables
  const customer = await MyGlobal.prisma.ecommerce_customers.findFirst({
    where: { deleted_at: null },
    select: { id: true },
  });
  const seller = await MyGlobal.prisma.ecommerce_sellers.findFirst({
    where: { deleted_at: null },
    select: { id: true },
  });
  // Must be either customer or seller
  if (!customer && !seller) {
    throw new HttpException("Unauthorized", 401);
  }
  // Check if already an administrator
  if (customer) {
    const isAdmin = await MyGlobal.prisma.ecommerce_admins.findFirst({
      where: { id: customer.id, deleted_at: null },
    });
    if (isAdmin) {
      throw new HttpException("Already an administrator", 400);
    }
  }
  if (seller) {
    const isAdmin = await MyGlobal.prisma.ecommerce_admins.findFirst({
      where: { id: seller.id, deleted_at: null },
    });
    if (isAdmin) {
      throw new HttpException("Already an administrator", 400);
    }
  }
  // Check for existing pending request
  if (customer) {
    const existingRequest =
      await MyGlobal.prisma.ecommerce_admin_requests.findFirst({
        where: {
          requester_type: "customer",
          requester_customer_id: customer.id,
          status: "pending",
        },
      });
    if (existingRequest) {
      throw new HttpException(
        "Pending administrator request already exists",
        409,
      );
    }
  }
  if (seller) {
    const existingRequest =
      await MyGlobal.prisma.ecommerce_admin_requests.findFirst({
        where: {
          requester_type: "seller",
          requester_seller_id: seller.id,
          status: "pending",
        },
      });
    if (existingRequest) {
      throw new HttpException(
        "Pending administrator request already exists",
        409,
      );
    }
  }
  // Validate reason is non-empty
  if (!props.body.reason || props.body.reason.trim().length === 0) {
    throw new HttpException("Reason is required", 400);
  }
  // Create the admin request
  const record = await MyGlobal.prisma.ecommerce_admin_requests.create({
    data: await EcommerceAdminRequestCollector.collect({
      body: props.body,
      ...(customer ? { ecommerceCustomers: customer } : {}),
      ...(seller ? { ecommerceSellers: seller } : {}),
    }),
    ...EcommerceAdminRequestTransformer.select(),
  });
  return await EcommerceAdminRequestTransformer.transform(record);
}
