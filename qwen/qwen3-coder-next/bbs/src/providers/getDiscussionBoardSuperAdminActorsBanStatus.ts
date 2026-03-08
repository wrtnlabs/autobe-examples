import { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminActorsBanStatus(props: {
  superAdmin: SuperadminPayload;
}): Promise<IDiscussionBoardBanRecord.IStatus> {
  const banRecord =
    await MyGlobal.prisma.discussion_board_ban_records.findFirst({
      where: {
        discussion_board_member_id: props.superAdmin.id,
        unbanned_at: null,
        deleted_at: null,
      },
      select: {
        id: true,
        ban_reason: true,
        unban_reason: true,
        banned_at: true,
        unbanned_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: {
          select: {
            id: true,
          },
        },
        administrator: {
          select: {
            id: true,
          },
        },
      },
    });
  if (!banRecord) {
    return {
      is_banned: false,
      banned_at: new Date().toISOString() as string & tags.Format<"date-time">,
    };
  }
  return {
    is_banned: !banRecord.unbanned_at,
    ban_reason: banRecord.ban_reason,
    banned_at: banRecord.banned_at.toISOString() as string &
      tags.Format<"date-time">,
    unbanned_at:
      (banRecord.unbanned_at?.toISOString() as string &
        tags.Format<"date-time">) ?? null,
  };
}
