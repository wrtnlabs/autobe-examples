import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodolistmemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodolistmemberSession";
import { IPageITodoListTodolistmemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTodolistmemberSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoListTodolistmember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodolistmember";
import { TodolistmemberPayload } from "../decorators/payload/TodolistmemberPayload";

export async function patchTodoListTodoListMemberActorsMeSessions(props: {
  todoListMember: TodolistmemberPayload;
  body: ITodoListTodolistmemberSession.IRequest;
}): Promise<IPageITodoListTodolistmemberSession> {
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;

  // Get all sessions for this member
  const whereCondition = {
    todo_list_todolistmember_id: props.todoListMember.id,
  };

  // Fetch member email for ISummary projection
  const member = await MyGlobal.prisma.todo_list_todolistmembers.findUnique({
    where: { id: props.todoListMember.id },
  });

  if (!member || !member.email) {
    throw new HttpException("Member not found", 404);
  }

  const [sessions, count] = await Promise.all([
    MyGlobal.prisma.todo_list_todolistmember_sessions.findMany({
      where: whereCondition,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.todo_list_todolistmember_sessions.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: count,
      pages: Math.ceil(count / limit),
    },
    data: sessions.map((session) => ({
      id: session.id,
      member: {
        id: props.todoListMember.id,
        email: member.email,
      },
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: toISOStringSafe(session.created_at),
      expired_at: session.expired_at
        ? toISOStringSafe(session.expired_at)
        : undefined,
    })),
  };
}
