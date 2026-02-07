import { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";
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

export async function getDiscussionBoardAdminAdminSessionsSessionId(props: {
  admin: AdminPayload;
  sessionId: string;
}): Promise<IDiscussionBoardAdminSession> {
  const session =
    await MyGlobal.prisma.discussion_board_admin_sessions.findUnique({
      where: { id: props.sessionId as string & tags.Format<"uuid"> },
      select: {
        id: true,
        discussion_board_admin_id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
      },
    });
  if (!session) {
    throw new HttpException("Session not found", 404);
  }
  const admin = await MyGlobal.prisma.discussion_board_admins.findUnique({
    where: {
      id: session.discussion_board_admin_id as string & tags.Format<"uuid">,
    },
    select: {
      id: true,
      email: true,
      display_name: true,
      status: true,
      assigned_at: true,
    },
  });
  return {
    id: session.id as string & tags.Format<"uuid">,
    discussion_board_admin_id: session.discussion_board_admin_id as string &
      tags.Format<"uuid">,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer ?? null,
    created_at: toISOStringSafe(session.created_at),
    expired_at: toISOStringSafe(session.expired_at),
    admin: {
      id: admin?.id as string & tags.Format<"uuid">,
      email: admin?.email,
      name: admin?.display_name,
      role: "user" as "user",
      status: admin?.status,
      created_at: toISOStringSafe(admin?.assigned_at ?? new Date()),
      updated_at: toISOStringSafe(admin?.assigned_at ?? new Date()),
    },
  };
}
