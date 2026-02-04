import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallAdminRequestRejectResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRequestRejectResponse";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";

export async function postShoppingMallSuperAdminAdminsRequestsAdminRequestIdReject(props: {
  superAdmin: SuperadminPayload;
  adminRequestId: string;
  body: IShoppingMallCancellationRequest;
}): Promise<IShoppingMallAdminRequestRejectResponse> {
  // Verify the administrator request exists and is active
  const admin = await MyGlobal.prisma.shopping_mall_admins.findUnique({
    where: {
      id: props.adminRequestId,
      deleted_at: null,
    },
  });
  if (!admin) {
    throw new HttpException("Administrator request not found", 404);
  }
  // Create an immutable snapshot of the admin request state before rejection
  await MyGlobal.prisma.shopping_mall_refund_request_snapshots.create({
    data: {
      id: v4(),
      admin: { connect: { id: admin.id } },
      requested_role: "pending",
      reason: "No reason available",
      status: "rejected",
      created_at: toISOStringSafe(admin.created_at),
      rejected_at: toISOStringSafe(admin.created_at),
      rejected_by_super_admin_id: props.superAdmin.id,
      rejection_reason: props.body.reason,
    },
  });
  // Update the administrator record status to 'rejected'
  await MyGlobal.prisma.shopping_mall_admins.update({
    where: {
      id: props.adminRequestId,
    },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
  // Return empty confirmation object
  return {};
}
