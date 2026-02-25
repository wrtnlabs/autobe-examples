import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardSuperAdminUserBansBanId(props: {
  superAdmin: SuperAdminPayload;
  banId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First verify the ban record exists and get details for audit logging
  const banRecord =
    await MyGlobal.prisma.discussion_board_user_bans.findUniqueOrThrow({
      where: { id: props.banId },
    });
  // Perform hard delete operation
  await MyGlobal.prisma.discussion_board_user_bans.delete({
    where: { id: props.banId },
  });
  // Log the administrative action for audit trail
  await MyGlobal.prisma.discussion_board_audit_logs.create({
    data: {
      id: v4(),
      actor_id: props.superAdmin.id,
      actor_type: "super_admin",
      action_type: "BAN_DELETED",
      description: `Super admin ${props.superAdmin.id} deleted ban record ${props.banId} for user ${banRecord.banned_user_id}`,
      target_user_id: banRecord.banned_user_id,
      created_at: new Date(),
      updated_at: new Date(),
      success: true,
    },
  });
}
