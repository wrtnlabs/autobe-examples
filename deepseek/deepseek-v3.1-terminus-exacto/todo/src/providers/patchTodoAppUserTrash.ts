import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppTrashItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTrashItem";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppTrashItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTrashItem";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
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
  const limit = Math.max(1, Math.min(100, props.body.limit ?? 100));
  const skip = (page - 1) * limit;
  // Build where conditions based on request filters
  const whereInput = {
    todo_app_user_id: props.user.id,
    deleted_at: {
      ...(props.body.deleted_from && { gte: props.body.deleted_from }),
      ...(props.body.deleted_to && { lte: props.body.deleted_to }),
    },
    ...(props.body.include_restored === false ? { restored_at: null } : {}),
    ...(props.body.include_permanent_deleted === false
      ? { permanently_deleted_at: null }
      : {}),
  } satisfies Prisma.todo_app_trash_itemsWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_app_trash_items.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { deleted_at: "desc" },
      ...TodoAppTrashItemAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.todo_app_trash_items.count({
      where: whereInput,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      TodoAppTrashItemAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
