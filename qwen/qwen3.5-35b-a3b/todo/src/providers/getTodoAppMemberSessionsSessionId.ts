import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppMemberSessionTransformer } from "../transformers/TodoAppMemberSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppMemberSessionsSessionId(props: {
  member: MemberPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ITodoAppMemberSession> {
  const session =
    await MyGlobal.prisma.todo_app_member_sessions.findUniqueOrThrow({
      where: { id: props.sessionId },
      include: {
        member: TodoAppMemberSessionTransformer.select().select.member,
      },
    });
  if (session.todo_app_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const transformed = await TodoAppMemberSessionTransformer.transform({
    id: session.id,
    member: {
      id: session.member.id,
      email: session.member.email,
      display_name: session.member.display_name,
      created_at: session.member.created_at,
      updated_at: session.member.created_at,
      deleted_at: session.member.deleted_at,
      password_hash: "",
      memberSessions: [],
      passwordResets: [],
      emailVerifications: [],
      todos: [],
      editHistories: [],
      profile: null,
    },
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: session.created_at,
    expired_at: session.expired_at,
  });
  return transformed;
}
