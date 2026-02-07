import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoSystemConfig";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { TodoSystemConfigCollector } from "../collectors/TodoSystemConfigCollector";
import { TodoSystemConfigTransformer } from "../transformers/TodoSystemConfigTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postTodoSystemConfigs(props: {
  body: ITodoSystemConfig.ICreate;
}): Promise<ITodoSystemConfig> {
  const created = await MyGlobal.prisma.todo_system_configs.create({
    data: await TodoSystemConfigCollector.collect({ body: props.body }),
    ...TodoSystemConfigTransformer.select(),
  });
  return await TodoSystemConfigTransformer.transform(created);
}
