import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppGuestSession";
import { ITodoAppGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppMemberSessions(props: {
  member: MemberPayload;
}): Promise<IPageITodoAppGuestSession.ISummary> {
  const limit = 20;
  const skip = 0;
  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.todo_app_member_sessions.findMany({
      where: {
        todo_app_member_id: props.member.id,
        expired_at: null,
      },
      orderBy: {
        created_at: "desc",
      },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.todo_app_member_sessions.count({
      where: {
        todo_app_member_id: props.member.id,
        expired_at: null,
      },
    }),
  ]);
  const data = sessions.map((session) => ({
    id: session.id,
    ip: session.ip,
    user_agent: session.user_agent ?? null,
    referrer: session.referrer ?? null,
    last_used_at: session.last_used_at
      ? (toISOStringSafe(session.last_used_at) as string &
          tags.Format<"date-time">)
      : null,
    created_at: toISOStringSafe(session.created_at) as string &
      tags.Format<"date-time">,
  }));
  return {
    pagination: {
      current: 1,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data as ITodoAppGuestSession.ISummary[],
  };
}
