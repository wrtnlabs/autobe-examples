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
import { IEconomicForumAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putEconomicForumAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string;
  body: IEconomicForumAdmin.IUpdate;
}): Promise<IEconomicForumAdmin> {
  // Fetch the target admin from the database
  const targetAdmin = await MyGlobal.prisma.economic_forum_admins.findUnique({
    where: { id: props.adminId },
  });
  // Verify the target admin exists
  if (!targetAdmin) {
    throw new HttpException("Administrator not found", 404);
  }
  // The operation specification doesn't restrict admin updates to self, so any admin can update any admin
  // This implementation follows the principle of least privilege by only allowing update to the email field
  // which is the only field specified in IEconomicForumAdmin.IUpdate
  // Prepare update data
  const updateData: {
    email?: string;
    updated_at: string;
  } = {
    updated_at: toISOStringSafe(new Date()),
  };
  // If email is provided in the request, update it
  // Note: IEconomicForumAdmin.IUpdate defines email as optional: email?: (string & tags.Format<'email'>) | undefined
  if (props.body.email !== undefined) {
    // Validate email format according to the DTO specification
    if (!typia.is<string & tags.Format<"email">>(props.body.email)) {
      throw new HttpException("Invalid email format", 400);
    }
    updateData.email = props.body.email;
  }
  // Update the admin record in the database
  const updatedAdmin = await MyGlobal.prisma.economic_forum_admins.update({
    where: { id: props.adminId },
    data: updateData,
  });
  // Generate a new authentication token using MyGlobal.secret
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        id: updatedAdmin.id,
        session_id: props.admin.session_id,
        type: "admin",
      },
      MyGlobal.secret,
      { expiresIn: "15m" },
    ),
    refresh: jwt.sign(
      {
        id: updatedAdmin.id,
        session_id: props.admin.session_id,
        type: "admin",
      },
      MyGlobal.secret,
      { expiresIn: "7d" },
    ),
    expired_at: toISOStringSafe(new Date(Date.now() + 15 * 60 * 1000)), // 15 minutes
    refreshable_until: toISOStringSafe(
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ), // 7 days
  };
  // Return the updated admin record with the new token
  return {
    id: updatedAdmin.id,
    token: token,
  };
}
