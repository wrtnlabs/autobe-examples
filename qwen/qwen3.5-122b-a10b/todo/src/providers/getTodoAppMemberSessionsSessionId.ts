import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
      ...TodoAppMemberSessionTransformer.select(),
    });
  if (session.todo_app_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await TodoAppMemberSessionTransformer.transform(session);
}
