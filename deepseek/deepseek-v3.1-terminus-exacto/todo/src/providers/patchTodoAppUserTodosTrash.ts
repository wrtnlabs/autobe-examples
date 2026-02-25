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

export async function patchTodoAppUserTodosTrash(props: {
  user: UserPayload;
  body: ITodoAppTrashItem.IRequest;
}): Promise<IPageITodoAppTrashItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause with user scope
  const whereInput = {
    todo_app_user_id: props.user.id,
    ...(props.body.restored_at !== undefined && {
      restored_at:
        props.body.restored_at !== null
          ? { equals: props.body.restored_at }
          : null,
    }),
    ...(props.body.deleted_at_from && {
      deleted_at: { gte: props.body.deleted_at_from },
    }),
    ...(props.body.deleted_at_to && {
      deleted_at: { lte: props.body.deleted_at_to },
    }),
  } satisfies Prisma.todo_app_trash_itemsWhereInput;
  // Query trash items with pagination
  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_app_trash_items.findMany({
      where: whereInput,
      skip,
      take: limit,
      ...TodoAppTrashItemAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.todo_app_trash_items.count({ where: whereInput }),
  ]);
  // Transform results using available transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    TodoAppTrashItemAtSummaryTransformer.transform,
  );
  // Return paginated response
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedData,
  } satisfies IPageITodoAppTrashItem.ISummary;
}
