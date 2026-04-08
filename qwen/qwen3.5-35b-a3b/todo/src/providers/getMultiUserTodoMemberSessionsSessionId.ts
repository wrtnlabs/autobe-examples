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
import { MultiUserTodoMemberSessionTransformer } from "../transformers/MultiUserTodoMemberSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// Get MultiUserTodoMemberSessions by SessionId
// Retrieves detailed information about a specific session with client context
// and timestamps. Only accessible when authenticated as the session owner.
export async function getMultiUserTodoMemberSessionsSessionId(props: {
  sessionId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoMemberSession> {
  // Query session from database with member relation joined
  const record =
    await MyGlobal.prisma.multi_user_todo_member_sessions.findUniqueOrThrow({
      where: {
        id: props.sessionId,
      },
      ...MultiUserTodoMemberSessionTransformer.select(),
    });
  // Transform database record to response DTO
  return await MultiUserTodoMemberSessionTransformer.transform(record);
}
