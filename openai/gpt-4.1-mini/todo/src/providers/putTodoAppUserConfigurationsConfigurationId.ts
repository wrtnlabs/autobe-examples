import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfiguration";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppConfigurationTransformer } from "../transformers/TodoAppConfigurationTransformer";

export async function putTodoAppUserConfigurationsConfigurationId(props: {
  user: UserPayload;
  configurationId: string & tags.Format<"uuid">;
  body: ITodoAppConfiguration.IUpdate;
}): Promise<ITodoAppConfiguration> {
  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;
  const updateData: Partial<Prisma.todo_app_configurationsUpdateInput> = {};
  if (props.body.key !== undefined) updateData.key = props.body.key;
  if (props.body.value !== undefined) updateData.value = props.body.value;
  if (props.body.description !== undefined)
    updateData.description = props.body.description;
  if (props.body.updated_at === undefined || props.body.updated_at === null) {
    updateData.updated_at = now;
  } else {
    updateData.updated_at = props.body.updated_at;
  }
  const updated = await MyGlobal.prisma.todo_app_configurations.update({
    where: { id: props.configurationId },
    data: updateData,
  });
  return await TodoAppConfigurationTransformer.transform(updated);
}
