import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoSystemConfig";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { TodoSystemConfigTransformer } from "../transformers/TodoSystemConfigTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putTodoSystemConfigsConfigId(props: {
  configId: string & tags.Format<"uuid">;
  body: ITodoSystemConfig.IUpdate;
}): Promise<ITodoSystemConfig> {
  const config = await MyGlobal.prisma.todo_system_configs.findUnique({
    where: { id: props.configId },
    ...TodoSystemConfigTransformer.select(),
  });
  if (!config) throw new HttpException("System configuration not found", 404);
  const updateData: Partial<
    Pick<
      Prisma.todo_system_configsUpdateInput,
      | "email_verification_timeout"
      | "password_reset_timeout"
      | "feature_flags"
      | "updated_at"
    >
  > = {};
  if (Object.keys(updateData).length === 0) {
    throw new HttpException(
      "At least one field must be provided for update",
      400,
    );
  }
  updateData.updated_at = toISOStringSafe(new Date());
  const updatedConfig = await MyGlobal.prisma.todo_system_configs.update({
    where: { id: props.configId },
    data: updateData,
    ...TodoSystemConfigTransformer.select(),
  });
  return TodoSystemConfigTransformer.transform(updatedConfig);
}
