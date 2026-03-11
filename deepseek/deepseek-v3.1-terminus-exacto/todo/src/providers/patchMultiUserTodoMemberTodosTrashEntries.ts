import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { IMultiUserTodoTodoTrashEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoTrashEntry";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMultiUserTodoTodoTrashEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodoTrashEntry";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoTodoTrashEntryAtSummaryTransformer } from "../transformers/MultiUserTodoTodoTrashEntryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoMemberTodosTrashEntries(props: {
  member: MemberPayload;
  body: IMultiUserTodoTodoTrashEntry.IRequest;
}): Promise<IPageIMultiUserTodoTodoTrashEntry.ISummary> {
  // Calculate pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput = {
    AND: [
      // Exclude permanently deleted entries
      { permanently_deleted_at: null },
      // Exclude restored entries
      { restored_at: null },
      // Filter by deletion date range if provided
      ...(props.body.deleted_at_start || props.body.deleted_at_end
        ? [
            {
              deleted_at: {
                ...(props.body.deleted_at_start && {
                  gte: new Date(props.body.deleted_at_start),
                }),
                ...(props.body.deleted_at_end && {
                  lte: new Date(props.body.deleted_at_end),
                }),
              },
            },
          ]
        : []),
      // Ensure todo belongs to current member through join
      {
        todo: {
          multi_user_todo_member_id: props.member.id,
          deleted_at: null, // Only active todos that have been moved to trash
        },
      },
    ],
  } satisfies Prisma.multi_user_todo_todo_trash_entriesWhereInput;
  // Query paginated data
  const data =
    await MyGlobal.prisma.multi_user_todo_todo_trash_entries.findMany({
      where: whereInput,
      orderBy: { deleted_at: "desc" as const }, // Newest deletions first
      skip,
      take: limit,
      ...MultiUserTodoTodoTrashEntryAtSummaryTransformer.select(),
    });
  // Count total records
  const total = await MyGlobal.prisma.multi_user_todo_todo_trash_entries.count({
    where: whereInput,
  });
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    MultiUserTodoTodoTrashEntryAtSummaryTransformer.transform,
  );
  // Return paginated response
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
