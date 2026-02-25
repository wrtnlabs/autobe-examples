import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTrashSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTrashSetting";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppTrashSettingTransformer } from "../transformers/TodoAppTrashSettingTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppUserTrashSettings(props: {
  user: UserPayload;
}): Promise<ITodoAppTrashSetting> {
  const settings = await MyGlobal.prisma.todo_app_trash_settings.findFirst({
    where: {
      todo_app_user_id: props.user.id,
      deleted_at: null,
    },
    ...TodoAppTrashSettingTransformer.select(),
  });
  if (!settings) {
    throw new HttpException("Trash settings not found", 404);
  }
  return await TodoAppTrashSettingTransformer.transform(settings);
}
