import { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminBansBanId(props: {
  admin: AdminPayload;
  banId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardBanRecord> {
  const banRecord =
    await MyGlobal.prisma.discussion_board_ban_records.findUniqueOrThrow({
      where: { id: props.banId },
      select: {
        id: true,
        discussion_board_member_id: true,
        administrator_id: true,
        ban_reason: true,
        unban_reason: true,
        banned_at: true,
        unbanned_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  // Fetch user details
  const userRecord = await MyGlobal.prisma.discussion_board_members.findUnique({
    where: { id: banRecord.discussion_board_member_id },
    select: {
      id: true,
      created_at: true,
    },
  });
  // Fetch administrator details
  const adminRecord = await MyGlobal.prisma.discussion_board_admins.findUnique({
    where: { id: banRecord.administrator_id },
    select: {
      id: true,
      created_at: true,
    },
  });
  return {
    id: banRecord.id,
    user: {
      id: userRecord?.id ?? banRecord.discussion_board_member_id,
      session_token: "",
      created_at: userRecord?.created_at
        ? toISOStringSafe(userRecord.created_at)
        : "",
    } satisfies IDiscussionBoardGuest.ISummary,
    administrator: {
      id: adminRecord?.id ?? banRecord.administrator_id,
      session_token: "",
      created_at: adminRecord?.created_at
        ? toISOStringSafe(adminRecord.created_at)
        : "",
    } satisfies IDiscussionBoardGuest.ISummary,
    ban_reason: banRecord.ban_reason,
    unban_reason: banRecord.unban_reason ?? undefined,
    banned_at: toISOStringSafe(banRecord.banned_at),
    unbanned_at: banRecord.unbanned_at
      ? toISOStringSafe(banRecord.unbanned_at)
      : "",
    created_at: toISOStringSafe(banRecord.created_at),
    updated_at: toISOStringSafe(banRecord.updated_at),
    deleted_at: banRecord.deleted_at
      ? toISOStringSafe(banRecord.deleted_at)
      : null,
  };
}
