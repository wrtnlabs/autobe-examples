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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallAdminRequestTransformer } from "../transformers/EcommerceMallAdminRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerAdminRequests(props: {
  seller: SellerPayload;
  body: IEcommerceMallAdminRequest.ICreate;
}): Promise<IEcommerceMallAdminRequest> {
  // Step 1: Get seller email to check for existing admin account
  const sellerRecord =
    await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow({
      where: { id: props.seller.id },
      select: { email: true },
    });
  // Step 2: Check if seller is already an administrator
  const existingAdmin = await MyGlobal.prisma.ecommerce_mall_admins.findFirst({
    where: {
      email: sellerRecord.email,
      deleted_at: null,
    },
  });
  if (existingAdmin) {
    throw new HttpException("ADMIN_ALREADY_EXISTS", 403);
  }
  // Step 3: Check for existing pending admin request
  const existingPendingRequest =
    await MyGlobal.prisma.ecommerce_mall_admin_request_of_sellers.findFirst({
      where: {
        ecommerce_mall_seller_id: props.seller.id,
        adminRequest: {
          status: "pending",
          deleted_at: null,
        },
      },
    });
  if (existingPendingRequest) {
    throw new HttpException("PENDING_REQUEST_EXISTS", 400);
  }
  // Step 4: Generate request ID and determine grade
  const requestId = v4();
  const requestedGrade = props.body.requested_grade ?? "admin";
  // Step 5: Create admin request and subtype record in transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Create main admin request record
    await tx.ecommerce_mall_admin_requests.create({
      data: {
        id: requestId,
        actor_type: "seller",
        requested_grade: requestedGrade,
        reason: props.body.reason,
        status: "pending",
        reviewed_by_id: null,
        reviewed_reason: null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
    // Create subtype record linking seller to request
    await tx.ecommerce_mall_admin_request_of_sellers.create({
      data: {
        ecommerce_mall_seller_id: props.seller.id,
        ecommerce_mall_admin_request_id: requestId,
        id: v4(),
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  });
  // Step 6: Fetch and return created record using transformer
  const created =
    await MyGlobal.prisma.ecommerce_mall_admin_requests.findUniqueOrThrow({
      where: { id: requestId },
      ...EcommerceMallAdminRequestTransformer.select(),
    });
  return EcommerceMallAdminRequestTransformer.transform(created);
}
