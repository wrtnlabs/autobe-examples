import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoSystemConfiguration";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace MultiUserTodoSystemConfigurationCollector {
  export async function collect(props: {
    body: IMultiUserTodoSystemConfiguration.ICreate;
  }) {
    const id: string = v4();
    return {
      // Primary key
      id,
      // Direct DTO mappings
      config_key: props.body.config_key,
      config_value: props.body.config_value,
      data_type: props.body.data_type,
      scope: props.body.scope,
      description: props.body.description,
      is_active: props.body.is_active ?? true,
      // System-generated fields
      version: 1,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // Relations (not applicable for creation)
      performanceMetrics: undefined,
      backupLogs: undefined,
    } satisfies Prisma.multi_user_todo_system_configurationsCreateInput;
  }
}
