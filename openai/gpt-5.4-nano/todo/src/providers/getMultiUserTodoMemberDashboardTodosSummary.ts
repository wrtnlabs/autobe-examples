import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistoryEntry";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoTodoEditHistoryEntryTransformer } from "../transformers/MultiUserTodoTodoEditHistoryEntryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMultiUserTodoMemberDashboardTodosSummary(props: {
  member: MemberPayload;
}): Promise<IMultiUserTodoTodoEditHistoryEntry> {
  const record =
    await MyGlobal.prisma.multi_user_todo_todo_edit_history_entries.findFirstOrThrow(
      {
        ...MultiUserTodoTodoEditHistoryEntryTransformer.select(),
        where: { multi_user_todo_owner_id: props.member.id },
      },
    );
  return await MultiUserTodoTodoEditHistoryEntryTransformer.transform(record);
}
