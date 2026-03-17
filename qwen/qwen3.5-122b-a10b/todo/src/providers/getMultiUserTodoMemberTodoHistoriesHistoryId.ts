import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { IMultiUserTodoTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoTodoHistoryTransformer } from "../transformers/MultiUserTodoTodoHistoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMultiUserTodoMemberTodoHistoriesHistoryId(props: {
  member: MemberPayload;
  historyId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoTodoHistory> {
  // Retrieve the history record by ID with all necessary fields
  const history =
    await MyGlobal.prisma.multi_user_todo_todo_histories.findUniqueOrThrow({
      where: { id: props.historyId },
      ...MultiUserTodoTodoHistoryTransformer.select(),
    });
  // Verify ownership - the history record's member must match the authenticated member
  if (history.member.id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check soft delete - if deleted_at is not null, the record is deleted
  if (history.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  // Transform and return using the transformer
  return await MultiUserTodoTodoHistoryTransformer.transform(history);
}
