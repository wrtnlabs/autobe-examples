import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodoFilterSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoFilterSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_multi_user_todo_todo_filter_setting(
  input?: DeepPartial<IMultiUserTodoTodoFilterSetting.ICreate>,
): IMultiUserTodoTodoFilterSetting.ICreate {
  return {
    name:
      input?.name ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<2>
        >(),
      }),
    filter_type:
      input?.filter_type ??
      RandomGenerator.pick([
        "completion_status",
        "date_range",
        "priority",
        "category",
        "tag",
      ] as const),
    is_default: input?.is_default ?? typia.random<boolean>(),
  };
}
