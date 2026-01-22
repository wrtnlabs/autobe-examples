import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfiguration";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace TodoAppConfigurationCollector {
  export async function collect(props: {
    body: ITodoAppConfiguration.ICreate;
  }) {
    return {
      id: v4(),
      key: props.body.key,
      value: props.body.value,
      type: props.body.type ?? "",
      description: props.body.description ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.todo_app_configurationsCreateInput;
  }
}
