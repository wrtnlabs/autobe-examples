import { IEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequest";
import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallAdminRequestTransformer } from "../transformers/EcommerceMallAdminRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerAdminRequests(props: {
  customer: CustomerPayload;
  body: IEcommerceMallAdminRequest.ICreate;
}): Promise<IEcommerceMallAdminRequest> {
  // Check if customer is already an administrator
  const existingAdmin = await MyGlobal.prisma.ecommerce_mall_admins.findFirst({
    where: {
      id: props.customer.id,
      deleted_at: null,
    },
  });
  if (existingAdmin !== null) {
    throw new HttpException("You are already an administrator", 403);
  }
  // Check if customer has a pending admin request
  const existingRequest =
    await MyGlobal.prisma.ecommerce_mall_admin_request_of_customers.findFirst({
      where: {
        ecommerce_mall_customer_id: props.customer.id,
        adminRequest: {
          status: "pending",
          deleted_at: null,
        },
      },
    });
  if (existingRequest !== null) {
    throw new HttpException("You already have a pending admin request", 400);
  }
  // Generate IDs and timestamps
  const requestId = v4();
  const customerLinkId = v4();
  const now = new Date();
  // Create admin request with customer link in transaction
  await MyGlobal.prisma.ecommerce_mall_admin_requests.create({
    data: {
      id: requestId,
      actor_type: "customer",
      requested_grade: props.body.requested_grade ?? "admin",
      reason: props.body.reason,
      status: "pending",
      reviewed_reason: undefined,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      customer: {
        create: {
          id: customerLinkId,
          ecommerce_mall_customer_id: props.customer.id,
          created_at: now,
          updated_at: now,
        },
      },
    },
  });
  // Fetch created request with all relations for response
  const createdRequest =
    await MyGlobal.prisma.ecommerce_mall_admin_requests.findUniqueOrThrow({
      where: { id: requestId },
      ...EcommerceMallAdminRequestTransformer.select(),
    });
  return await EcommerceMallAdminRequestTransformer.transform(createdRequest);
}
