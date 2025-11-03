import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoUserTodoItemsItemId(props: {
  user: UserPayload;
  itemId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { user, itemId } = props;

  // Verify the todo item exists and belongs to the authenticated user
  await MyGlobal.prisma.todo_items.delete({
    where: {
      id: itemId,
      todo_user_id: user.id,
    },
  });
}
