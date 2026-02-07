import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace TodoAppSystemSettingCollector {
  export async function collect(props: {
    body: ITodoAppSystemSetting.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      key: props.body.key ?? "",
      value: props.body.value ?? "",
      description: props.body.description ?? null,
      is_json: props.body.is_json,
      created_at: new Date(),
      updated_at: new Date(),
    } satisfies Prisma.todo_app_system_settingsCreateInput;
  }
}
