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

export async function getTodoSystemConfigsConfigId(props: {
  configId: string & tags.Format<"uuid">;
}): Promise<ITodoSystemConfig> {
  const config = await MyGlobal.prisma.todo_system_configs.findUnique({
    where: { id: props.configId },
    ...TodoSystemConfigTransformer.select(),
  });
  if (!config) throw new HttpException("System config not found", 404);
  return await TodoSystemConfigTransformer.transform(config);
}
