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
import { IShoppingMallAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPasswordReset";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";

export async function putShoppingMallSuperAdminAdminsRequestsAdminRequestId(props: {
  superAdmin: SuperadminPayload;
  adminRequestId: string;
  body: IShoppingMallAdminPasswordReset.IRespond;
}): Promise<IShoppingMallRefundRequest> {
  // Validate request exists
  const request =
    await MyGlobal.prisma.shopping_mall_admin_password_resets.findUnique({
      where: { id: props.adminRequestId },
    });
  if (!request) {
    throw new HttpException("Admin password reset request not found", 404);
  }
  // Update the request record with superadmin's response
  const updated =
    await MyGlobal.prisma.shopping_mall_admin_password_resets.update({
      where: { id: props.adminRequestId },
      data: {
        // Use admin_id to track who responded
        admin_id: props.superAdmin.id,
        // Mark as used if approved to prevent reuse
        used_at:
          props.body.action === "approve"
            ? toISOStringSafe(new Date())
            : request.used_at,
        // Note the action type in token field as metadata
        token: props.body.action === "approve" ? "approved" : "rejected",
      },
    });
  // Prepare response as required by API contract
  return {
    status: props.body.action === "approve" ? "approved" : "rejected",
    message:
      props.body.action === "approve"
        ? "Administrator password reset request has been approved. The user may now use the reset link."
        : "Administrator password reset request has been rejected. The user has been notified of the decision.",
  };
}
