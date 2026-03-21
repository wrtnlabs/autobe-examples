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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallAdminRequestTransformer } from "../transformers/EcommerceMallAdminRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallSuperAdminAdminRequestsRequestId(props: {
  superAdmin: SuperadminPayload;
  requestId: string & tags.Format<"uuid">;
  body: IEcommerceMallAdminRequest.IUpdate;
}): Promise<IEcommerceMallAdminRequest> {
  // 1. Find the admin request and validate it's pending
  const existingRequest =
    await MyGlobal.prisma.ecommerce_mall_admin_requests.findUniqueOrThrow({
      where: { id: props.requestId },
      ...EcommerceMallAdminRequestTransformer.select(),
    });
  if (existingRequest.status !== "pending") {
    throw new HttpException(
      `Admin request is not pending. Current status: ${existingRequest.status}`,
      400,
    );
  }
  // 2. If approved, get the email from the requesting actor
  let newAdminEmail: string | null = null;
  if (props.body.status === "approved") {
    if (existingRequest.actor_type === "customer") {
      const customerLink =
        await MyGlobal.prisma.ecommerce_mall_admin_request_of_customers.findUnique(
          {
            where: { ecommerce_mall_admin_request_id: props.requestId },
            select: { customer: { select: { email: true } } },
          },
        );
      if (!customerLink?.customer) {
        throw new HttpException("Customer not found for this request", 404);
      }
      newAdminEmail = customerLink.customer.email;
    } else if (existingRequest.actor_type === "seller") {
      const sellerLink =
        await MyGlobal.prisma.ecommerce_mall_admin_request_of_sellers.findUnique(
          {
            where: { ecommerce_mall_admin_request_id: props.requestId },
            select: { seller: { select: { email: true } } },
          },
        );
      if (!sellerLink?.seller) {
        throw new HttpException("Seller not found for this request", 404);
      }
      newAdminEmail = sellerLink.seller.email;
    }
  }
  // 3. Update the admin request record
  const updatedRequest =
    await MyGlobal.prisma.ecommerce_mall_admin_requests.update({
      where: { id: props.requestId },
      data: {
        status: props.body.status,
        reviewed_by_id: props.superAdmin.id,
        reviewed_reason: props.body.reviewed_reason ?? null,
        updated_at: new Date(),
      },
      ...EcommerceMallAdminRequestTransformer.select(),
    });
  // 4. Create admin record if approved
  if (props.body.status === "approved" && newAdminEmail) {
    const existingAdmin =
      await MyGlobal.prisma.ecommerce_mall_admins.findUnique({
        where: { email: newAdminEmail },
      });
    if (!existingAdmin) {
      await MyGlobal.prisma.ecommerce_mall_admins.create({
        data: {
          id: v4(),
          email: newAdminEmail,
          password_hash: "",
          name: "Promoted Admin",
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
      });
    }
  }
  // 5. Return the updated admin request using transformer
  return EcommerceMallAdminRequestTransformer.transform(updatedRequest);
}
