import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IMvTodoAppActiveConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IMvTodoAppActiveConfiguration";

export async function getTodoAppConfigurationsConfigKeyValuesEnvironment(props: {
  configKey: string;
  environment: string;
}): Promise<IMvTodoAppActiveConfiguration> {
  const configuration =
    await MyGlobal.prisma.mv_todo_app_active_configurations.findUnique({
      where: {
        config_key_environment: {
          config_key: props.configKey,
          environment: props.environment,
        },
      },
    });

  if (!configuration) {
    throw new HttpException(
      `Active configuration not found for key '${props.configKey}' in environment '${props.environment}'`,
      404,
    );
  }

  return {
    id: configuration.id,
    todo_app_configuration_id: configuration.todo_app_configuration_id,
    todo_app_configuration_value_id:
      configuration.todo_app_configuration_value_id !== null
        ? typia.assert<string & tags.Format<"uuid">>(
            configuration.todo_app_configuration_value_id,
          )
        : typia.assert<string & tags.Format<"uuid">>(v4()),
    config_key: configuration.config_key,
    environment: configuration.environment,
    effective_value: configuration.effective_value,
    value_source: configuration.value_source,
    data_type: configuration.data_type,
    category: configuration.category,
    is_sensitive: configuration.is_sensitive,
    last_updated: toISOStringSafe(configuration.last_updated),
  };
}
