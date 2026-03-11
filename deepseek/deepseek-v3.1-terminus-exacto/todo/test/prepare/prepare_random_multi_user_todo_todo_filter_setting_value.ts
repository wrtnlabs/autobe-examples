import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodoFilterSettingValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoFilterSettingValue";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_multi_user_todo_todo_filter_setting_value(
  input?: DeepPartial<IMultiUserTodoTodoFilterSettingValue.ICreate> | undefined,
): IMultiUserTodoTodoFilterSettingValue.ICreate {
  const resolvedKey =
    input?.key ??
    RandomGenerator.pick([
      "status",
      "priority",
      "category",
      "assignee",
      "due_date",
      "created_date",
    ] as const);
  const valueMap = {
    status: RandomGenerator.pick(["active", "completed", "pending"] as const),
    priority: RandomGenerator.pick(["high", "medium", "low"] as const),
    category: RandomGenerator.pick(["work", "personal", "shopping"] as const),
    assignee: RandomGenerator.name(1),
    due_date: RandomGenerator.date(
      new Date(),
      1000 * 60 * 60 * 24 * 30,
    ).toISOString(),
    created_date: RandomGenerator.date(
      new Date(Date.now() - 1000 * 60 * 60 * 24 * 365),
      1000 * 60 * 60 * 24 * 365,
    ).toISOString(),
  };
  const resolvedValue =
    input?.value ??
    valueMap[resolvedKey as keyof typeof valueMap] ??
    RandomGenerator.alphabets(8);
  return {
    key: resolvedKey,
    value: resolvedValue,
  };
}
