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

export async function putDiscussionBoardAdminDiscussionBoardAdminsDiscussionBoardAdminId(props: {
  admin: AdminPayload;
  discussionBoardAdminId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdmin.IUpdate;
}): Promise<IDiscussionBoardAdmin> {
  const { discussionBoardAdminId, body } = props;
  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.discussion_board_admins.update({
    where: {
      id: discussionBoardAdminId,
      deleted_at: null,
    },
    data: {
      email: body.email ?? undefined,
      updated_at: now,
    },
    include: {
      discussion_board_admin_sessions: true,
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    password_hash: updated.password_hash,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
    discussion_board_admin_sessions:
      updated.discussion_board_admin_sessions.map((session) => ({
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
