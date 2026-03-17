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
  sessionId: string;
}): Promise<ITodoAppMemberSession> {
  // Validate sessionId format using typia
  typia.assert<typeof props.sessionId>(props.sessionId);
  // Retrieve session with ownership check in WHERE clause
  const session = await MyGlobal.prisma.todo_app_member_sessions.findFirst({
    where: {
      id: props.sessionId,
      todo_app_member_id: props.member.id,
    },
    ...TodoAppMemberSessionTransformer.select(),
  });
  // If session not found, it's either doesn't exist or doesn't belong to member
  if (session === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if session is expired (optional security enhancement)
  const now = new Date();
  if (session.expired_at < now) {
    throw new HttpException("Session expired", 403);
  }
  return await TodoAppMemberSessionTransformer.transform(session);
}
