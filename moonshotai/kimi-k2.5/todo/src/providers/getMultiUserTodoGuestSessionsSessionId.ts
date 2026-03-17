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
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { MultiUserTodoMemberSessionTransformer } from "../transformers/MultiUserTodoMemberSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMultiUserTodoGuestSessionsSessionId(props: {
  guest: GuestPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoMemberSession> {
  // Retrieve the session and verify it belongs to the requesting member
  const session =
    await MyGlobal.prisma.multi_user_todo_member_sessions.findUniqueOrThrow({
      where: { id: props.sessionId },
      ...MultiUserTodoMemberSessionTransformer.select(),
    });
  // Authorization check: session must belong to the current member
  if (session.member.id !== props.guest.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await MultiUserTodoMemberSessionTransformer.transform(session);
}
