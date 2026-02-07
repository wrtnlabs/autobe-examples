import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTrashItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTrashItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_todo_app_trash_item(
  input?: DeepPartial<ITodoAppTrashItem.ICreate>,
): ITodoAppTrashItem.ICreate {
  return {
    todo_app_todo_id:
      input?.todo_app_todo_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
