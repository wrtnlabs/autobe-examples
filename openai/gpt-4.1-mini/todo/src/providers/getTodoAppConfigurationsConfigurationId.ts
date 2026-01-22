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
import { TodoAppConfigurationTransformer } from "../transformers/TodoAppConfigurationTransformer";

export async function getTodoAppConfigurationsConfigurationId(props: {
  configurationId: string & tags.Format<"uuid">;
}): Promise<ITodoAppConfiguration> {
  const record = await MyGlobal.prisma.todo_app_configurations.findUnique({
    where: { id: props.configurationId },
    ...TodoAppConfigurationTransformer.select(),
  });
  if (!record) {
    throw new HttpException("Configuration not found", 404);
  }
  return await TodoAppConfigurationTransformer.transform(record);
}
