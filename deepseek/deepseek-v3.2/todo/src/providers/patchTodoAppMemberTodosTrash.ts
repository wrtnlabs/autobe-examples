import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppTodoTrashItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoTrashItem";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppTodoTrashItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoTrashItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppTodoTrashItemTransformer } from "../transformers/TodoAppTodoTrashItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppMemberTodosTrash(props: {
  member: MemberPayload;
  body: ITodoAppTodoTrashItem.IRequest;
}): Promise<IPageITodoAppTodoTrashItem> {
  // Extract pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause with member filter
  const whereInput = {
    todo_app_member_id: props.member.id,
    // Handle date range filters (null means no filter)
    ...(props.body.deleted_at_min !== null &&
      props.body.deleted_at_min !== undefined && {
        deleted_at: { gte: new Date(props.body.deleted_at_min) },
      }),
    ...(props.body.deleted_at_max !== null &&
      props.body.deleted_at_max !== undefined && {
        deleted_at: { lte: new Date(props.body.deleted_at_max) },
      }),
    // Handle boolean existence filters
    ...(props.body.restored_at_exists !== undefined &&
      (props.body.restored_at_exists
        ? { restored_at: { not: null } }
        : { restored_at: null })),
    ...(props.body.permanently_deleted_at_exists !== undefined &&
      (props.body.permanently_deleted_at_exists
        ? { permanently_deleted_at: { not: null } }
        : { permanently_deleted_at: null })),
  } satisfies Prisma.todo_app_todo_trash_entriesWhereInput;
  // Fetch paginated data
  const data = await MyGlobal.prisma.todo_app_todo_trash_entries.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { deleted_at: "desc" as const },
    ...TodoAppTodoTrashItemTransformer.select(),
  });
  // Count total records with same WHERE clause
  const total = await MyGlobal.prisma.todo_app_todo_trash_entries.count({
    where: whereInput,
  });
  // Transform data using transformer
  const transformed = await ArrayUtil.asyncMap(
    data,
    TodoAppTodoTrashItemTransformer.transform,
  );
  // Return paginated response
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
