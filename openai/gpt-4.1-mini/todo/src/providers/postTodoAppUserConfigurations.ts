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
import { TodoAppConfigurationCollector } from "../collectors/TodoAppConfigurationCollector";
import { TodoAppConfigurationTransformer } from "../transformers/TodoAppConfigurationTransformer";

export async function postTodoAppUserConfigurations(props: {
  user: UserPayload;
  body: ITodoAppConfiguration.ICreate;
}): Promise<ITodoAppConfiguration> {
  const data = await TodoAppConfigurationCollector.collect({
    body: props.body,
  });
  const created = await MyGlobal.prisma.todo_app_configurations.create({
    data,
    ...TodoAppConfigurationTransformer.select(),
  });
  return await TodoAppConfigurationTransformer.transform(created);
}
