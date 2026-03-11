import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import { IEcommerceMallAdminRequestRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequestOfCustomer";
import { IEcommerceMallAdminRequestRequestOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequestOfSeller";
import { IEcommerceMallAdminRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestSnapshot";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallAdminRequestRequestTransformer } from "../transformers/EcommerceMallAdminRequestRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerAdminRequests(props: {
  customer: CustomerPayload;
  body: IEcommerceMallAdminRequestRequest.ICreate;
}): Promise<IEcommerceMallAdminRequestRequest> {
  const customerResult =
    await MyGlobal.prisma.ecommerce_mall_customers.findFirst({
      where: {
        id: props.customer.id,
        deleted_at: null,
      },
      select: { id: true, is_banned: true },
    });
  if (customerResult === null) {
    throw new HttpException("Customer not found", 404);
  }
  if (customerResult.is_banned) {
    throw new HttpException("Customer account is banned", 403);
  }
  const existingRequest =
    await MyGlobal.prisma.ecommerce_mall_admin_request_request_of_customers.findFirst(
      {
        where: {
          customer_id: props.customer.id,
          adminRequest: {
            request_status: "pending",
            deleted_at: null,
          },
        },
        include: {
          adminRequest: {
            select: { id: true },
          },
        },
      },
    );
  if (existingRequest) {
    throw new HttpException("Pending admin request already exists", 400);
  }
  const systemAdmin = await MyGlobal.prisma.ecommerce_mall_admins.findFirst({
    where: {
      is_banned: false,
    },
    select: { id: true },
  });
  if (systemAdmin === null) {
    throw new HttpException(
      "No system admin available to review requests",
      503,
    );
  }
  const requestId: string & tags.Format<"uuid"> = v4();
  const customerRequestId: string & tags.Format<"uuid"> = v4();
  const [adminRequest, customerLink] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.ecommerce_mall_admin_request_requests.create({
      data: {
        id: requestId,
        reason: props.body.reason,
        request_status: "pending",
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        admin: { connect: { id: systemAdmin.id } },
      },
      select: {
        id: true,
        reason: true,
        request_status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.ecommerce_mall_admin_request_request_of_customers.create({
      data: {
        id: customerRequestId,
        admin_request_id: requestId,
        customer_id: props.customer.id,
        created_at: new Date(),
        updated_at: new Date(),
      },
    }),
  ]);
  const fullRequest =
    await MyGlobal.prisma.ecommerce_mall_admin_request_requests.findUniqueOrThrow(
      {
        where: { id: requestId },
        ...EcommerceMallAdminRequestRequestTransformer.select(),
      },
    );
  return await EcommerceMallAdminRequestRequestTransformer.transform(
    fullRequest,
  );
}
