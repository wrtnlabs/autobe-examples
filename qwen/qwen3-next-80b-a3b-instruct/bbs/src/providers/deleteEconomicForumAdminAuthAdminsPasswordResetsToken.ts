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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteEconomicForumAdminAuthAdminsPasswordResetsToken(props: {
  admin: AdminPayload;
  token: string;
}): Promise<void> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now()),
  );
  // Find and delete the reset token record
  const deleted = await MyGlobal.prisma.$transaction(async (prisma) => {
    const reset = await prisma.economic_forum_admin_password_resets.findUnique({
      where: {
        token: props.token,
        expires_at: {
          gt: now,
        },
      },
    });
    if (!reset) {
      throw new HttpException("Token not found or expired", 404);
    }
    // Delete the record
    await prisma.economic_forum_admin_password_resets.delete({
      where: { id: reset.id },
    });
    // Log audit
    await prisma.economic_forum_system_audits.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        admin_id: props.admin.id as string & tags.Format<"uuid">,
        action: "PASSWORD_RESET_TOKEN_INVALIDATED",
        occurred_at: now,
        metadata: {
          token: props.token,
          admin_id: props.admin.id,
        },
      },
    });
    return true;
  });
  // If delete successful, return void
  return;
}
