import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRequest";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { ShoppingMallAdminRequestTransformer } from "../transformers/ShoppingMallAdminRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSuperAdminAdminRequestsRequestIdApprove(props: {
  superAdmin: SuperadminPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdminRequest> {
  // Step 1: Query the admin request to validate it exists and is pending
  const adminRequest =
    await MyGlobal.prisma.shopping_mall_admin_requests.findUniqueOrThrow({
      where: { id: props.requestId },
      select: {
        id: true,
        shopping_mall_customer_id: true,
        reason: true,
        status: true,
        requested_at: true,
        deleted_at: true,
        customer: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });
  // Step 2: Validate request is not deleted and status is PENDING
  if (adminRequest.deleted_at !== null) {
    throw new HttpException("Request has been deleted", 404);
  }
  if (adminRequest.status !== "PENDING") {
    throw new HttpException(
      `Request is already ${adminRequest.status}, cannot approve`,
      409,
    );
  }
  const now = new Date();
  // Step 3: Execute atomic transaction - update request, create snapshot, create admin account
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Update the admin request status to APPROVED
    await tx.shopping_mall_admin_requests.update({
      where: { id: props.requestId },
      data: {
        status: "APPROVED",
        responded_by_super_admin_id: props.superAdmin.id,
        responded_at: now,
        updated_at: now,
      },
    });
    // Create snapshot record for audit trail
    await tx.shopping_mall_admin_request_snapshots.create({
      data: {
        id: v4(),
        admin_request_id: props.requestId,
        responded_by_super_admin_id: props.superAdmin.id,
        user_id: adminRequest.shopping_mall_customer_id,
        reason: adminRequest.reason,
        status: "APPROVED",
        requested_at: adminRequest.requested_at,
        responded_at: now,
        created_at: now,
      },
    });
    // Create administrator account with ADMIN grade
    // Generate a random password hash - admin will need to reset password via password reset flow
    const tempPasswordHash = await PasswordUtil.hash(v4());
    await tx.shopping_mall_admins.create({
      data: {
        id: v4(),
        email: adminRequest.customer.email,
        password_hash: tempPasswordHash,
        grade: "ADMIN",
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  });
  // Step 4: Fetch the updated request with transformer select
  const updated =
    await MyGlobal.prisma.shopping_mall_admin_requests.findUniqueOrThrow({
      where: { id: props.requestId },
      ...ShoppingMallAdminRequestTransformer.select(),
    });
  // Step 5: Transform and return
  return await ShoppingMallAdminRequestTransformer.transform(updated);
}
