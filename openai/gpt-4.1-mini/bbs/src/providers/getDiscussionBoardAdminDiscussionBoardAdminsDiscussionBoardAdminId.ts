import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getDiscussionBoardAdminDiscussionBoardAdminsDiscussionBoardAdminId(props: {
  admin: AdminPayload;
  discussionBoardAdminId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdmin> {
  const { discussionBoardAdminId } = props;

  const adminRecord =
    await MyGlobal.prisma.discussion_board_admins.findUniqueOrThrow({
      where: {
        id: discussionBoardAdminId,
      },
      include: {
        discussion_board_admin_sessions: true,
      },
    });

  return {
    id: adminRecord.id,
    email: adminRecord.email,
    password_hash: adminRecord.password_hash,
    created_at: toISOStringSafe(adminRecord.created_at),
    updated_at: toISOStringSafe(adminRecord.updated_at),
    deleted_at: adminRecord.deleted_at
      ? toISOStringSafe(adminRecord.deleted_at)
      : null,
    discussion_board_admin_sessions:
      adminRecord.discussion_board_admin_sessions.map((session) => ({
        id: session.id,
        discussion_board_admin_id: session.discussion_board_admin_id,
        ip: session.ip,
        href: session.href,
        referrer: session.referrer,
        created_at: toISOStringSafe(session.created_at),
        expired_at: session.expired_at
          ? toISOStringSafe(session.expired_at)
          : null,
      })),
  };
}
