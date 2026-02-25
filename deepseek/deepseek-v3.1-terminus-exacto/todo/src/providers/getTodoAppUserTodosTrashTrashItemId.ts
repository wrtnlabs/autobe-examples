import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { TodoAppTrashItemTransformer } from "../transformers/TodoAppTrashItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppUserTodosTrashTrashItemId(props: {
  user: UserPayload;
  trashItemId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTrashItem> {
  const trashItem = await MyGlobal.prisma.todo_app_trash_items.findFirst({
    where: {
      id: props.trashItemId,
      todo_app_user_id: props.user.id,
      permanently_deleted_at: null,
    },
    ...TodoAppTrashItemTransformer.select(),
  });
  if (!trashItem) {
    throw new HttpException("Trash item not found", 404);
  }
  return await TodoAppTrashItemTransformer.transform(trashItem);
}
