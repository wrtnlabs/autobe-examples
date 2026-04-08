import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistoryEntry";
import { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMultiUserTodoTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodoEditHistoryEntry";
import { IPageIMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoTodoEditHistoryEntryAtSummaryTransformer } from "../transformers/MultiUserTodoTodoEditHistoryEntryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoMemberTodosTodoIdEditHistoryEntries(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  body: IMultiUserTodoTodoEditHistoryEntry.IRequest;
}): Promise<IPageIMultiUserTodoTodoEditHistoryEntry.ISummary> {
  const pageValue =
    props.body.page === undefined || props.body.page === null
      ? 1
      : props.body.page;
  const limitValue =
    props.body.limit === undefined || props.body.limit === null
      ? 100
      : props.body.limit;
  const current = (pageValue <= 0 ? 1 : pageValue) satisfies number as number;
  const limit = (limitValue <= 0 ? 100 : limitValue) satisfies number as number;
  const skip = (current - 1) * limit;
  const where = {
    multi_user_todo_todo_id: props.todoId,
    multi_user_todo_owner_id: props.member.id,
    deleted_at: null,
  } satisfies Prisma.multi_user_todo_todo_edit_history_entriesWhereInput;
  const recordsCount =
    await MyGlobal.prisma.multi_user_todo_todo_edit_history_entries.count({
      where,
    });
  const records =
    await MyGlobal.prisma.multi_user_todo_todo_edit_history_entries.findMany({
      where,
      orderBy: { edit_made_at: "desc" },
      skip,
      take: limit,
      ...MultiUserTodoTodoEditHistoryEntryAtSummaryTransformer.select(),
    });
  const pages = recordsCount === 0 ? 0 : Math.ceil(recordsCount / limit);
  return {
    pagination: {
      pagination: {
        current: current as number & tags.Type<"int32"> & tags.Minimum<0>,
        limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
        records: recordsCount as number & tags.Type<"int32"> & tags.Minimum<0>,
        pages: pages as number & tags.Type<"int32"> & tags.Minimum<0>,
      },
      data: [],
    },
    data: await ArrayUtil.asyncMap(records, (r) =>
      MultiUserTodoTodoEditHistoryEntryAtSummaryTransformer.transform(r),
    ),
  };
}
