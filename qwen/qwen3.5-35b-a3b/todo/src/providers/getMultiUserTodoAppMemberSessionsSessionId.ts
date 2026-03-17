import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoAppMemberSessionTransformer } from "../transformers/MultiUserTodoAppMemberSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMultiUserTodoAppMemberSessionsSessionId(props: {
  member: MemberPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoAppMemberSession> {
  const session =
    await MyGlobal.prisma.multi_user_todo_app_member_sessions.findUniqueOrThrow(
      {
        where: { id: props.sessionId },
        ...MultiUserTodoAppMemberSessionTransformer.select(),
      },
    );
  if (session.member.id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await MultiUserTodoAppMemberSessionTransformer.transform(session);
}
