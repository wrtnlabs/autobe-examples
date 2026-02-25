import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppTrashItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTrashItem";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppTrashItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTrashItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppTrashItemAtSummaryTransformer } from "../transformers/TodoAppTrashItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppUserTrash(props: {
  user: UserPayload;
  body: ITodoAppTrashItem.IRequest;
}): Promise<IPageITodoAppTrashItem.ISummary> {
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(Math.max(1, props.body.limit ?? 100), 100);
  const skip = (page - 1) * limit;
  // Build WHERE clause with user isolation
  const whereInput: Prisma.todo_app_trash_itemsWhereInput = {
    todo_app_user_id: props.user.id,
    permanently_deleted_at: null, // Only show trash items not permanently deleted
  };
  // Apply restoration status filter
  if (props.body.restored_at !== undefined) {
    if (props.body.restored_at === null) {
      whereInput.restored_at = null;
    } else {
      whereInput.restored_at = { equals: new Date(props.body.restored_at) };
    }
  }
  // Apply deletion date range filters
  const deletedAtConditions: Prisma.DateTimeFilter = {};
  if (
    props.body.deleted_at_from !== undefined &&
    props.body.deleted_at_from !== null
  ) {
    deletedAtConditions.gte = new Date(props.body.deleted_at_from);
  }
  if (
    props.body.deleted_at_to !== undefined &&
    props.body.deleted_at_to !== null
  ) {
    deletedAtConditions.lte = new Date(props.body.deleted_at_to);
  }
  if (Object.keys(deletedAtConditions).length > 0) {
    whereInput.deleted_at = deletedAtConditions;
  }
  const orderByInput = {
    deleted_at: "desc" as const,
  } satisfies Prisma.todo_app_trash_itemsOrderByWithRelationInput;
  // Fetch paginated data with transformer selection
  const data = await MyGlobal.prisma.todo_app_trash_items.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...TodoAppTrashItemAtSummaryTransformer.select(),
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.todo_app_trash_items.count({
    where: whereInput,
  });
  // Transform results using the transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    TodoAppTrashItemAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit) || 1,
    } satisfies IPage.IPagination,
  };
}
