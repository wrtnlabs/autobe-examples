import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { IMultiUserTodoMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoMemberSessionTransformer } from "../transformers/MultiUserTodoMemberSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMultiUserTodoMemberSessionsSessionId(props: {
  member: MemberPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoMemberSession> {
  // Fetch the session with member relationship
  const session =
    await MyGlobal.prisma.multi_user_todo_member_sessions.findUniqueOrThrow({
      where: { id: props.sessionId },
      ...MultiUserTodoMemberSessionTransformer.select(),
    });
  // Verify ownership: member can only view their own sessions
  if (session.member.id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Transform and return the session
  return await MultiUserTodoMemberSessionTransformer.transform(session);
}
