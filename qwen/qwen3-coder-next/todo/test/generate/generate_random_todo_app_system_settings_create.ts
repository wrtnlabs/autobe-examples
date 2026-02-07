import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_todo_app_system_setting } from "../prepare/prepare_random_todo_app_system_setting";

export async function generate_random_todo_app_system_settings_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ITodoAppSystemSetting.ICreate> | undefined;
  },
): Promise<ITodoAppSystemSetting> {
  const prepared: ITodoAppSystemSetting.ICreate =
    prepare_random_todo_app_system_setting(props.body);
  return await api.functional.todoApp.system_settings.create(connection, {
    body: prepared,
  });
}
