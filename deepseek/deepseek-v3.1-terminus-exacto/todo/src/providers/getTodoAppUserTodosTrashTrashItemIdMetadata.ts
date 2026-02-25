import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTrashItemMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTrashItemMetadatum";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppTrashItemMetadatumTransformer } from "../transformers/TodoAppTrashItemMetadatumTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppUserTodosTrashTrashItemIdMetadata(props: {
  user: UserPayload;
  trashItemId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTrashItemMetadatum> {
  // Verify the trash item exists and belongs to the current user
  await MyGlobal.prisma.todo_app_trash_items.findUniqueOrThrow({
    where: {
      id: props.trashItemId,
      todo_app_user_id: props.user.id,
    },
  });
  // Fetch the metadata using the transformer
  const metadata =
    await MyGlobal.prisma.todo_app_trash_item_metadata.findUniqueOrThrow({
      where: {
        todo_app_trash_item_id: props.trashItemId,
      },
      ...TodoAppTrashItemMetadatumTransformer.select(),
    });
  // Transform and return using the transformer
  return await TodoAppTrashItemMetadatumTransformer.transform(metadata);
}
