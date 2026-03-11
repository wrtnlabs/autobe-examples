import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoSystemConfiguration";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MultiUserTodoSystemConfigurationCollector } from "../collectors/MultiUserTodoSystemConfigurationCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { MultiUserTodoSystemConfigurationTransformer } from "../transformers/MultiUserTodoSystemConfigurationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMultiUserTodoAdminSystemConfigurations(props: {
  admin: AdminPayload;
  body: IMultiUserTodoSystemConfiguration.ICreate;
}): Promise<IMultiUserTodoSystemConfiguration> {
  const created =
    await MyGlobal.prisma.multi_user_todo_system_configurations.create({
      data: await MultiUserTodoSystemConfigurationCollector.collect({
        body: props.body,
      }),
      ...MultiUserTodoSystemConfigurationTransformer.select(),
    });
  return await MultiUserTodoSystemConfigurationTransformer.transform(created);
}
