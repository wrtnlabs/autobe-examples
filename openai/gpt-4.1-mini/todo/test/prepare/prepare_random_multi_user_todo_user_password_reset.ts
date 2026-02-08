import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_multi_user_todo_user_password_reset(
  input?: DeepPartial<IMultiUserTodoUserPasswordReset.ICreate> | undefined,
): IMultiUserTodoUserPasswordReset.ICreate {
  input;
  return {};
}
