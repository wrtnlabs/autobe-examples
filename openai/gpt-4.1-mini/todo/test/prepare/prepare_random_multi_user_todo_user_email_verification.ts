import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_multi_user_todo_user_email_verification(
  input?: DeepPartial<IMultiUserTodoUserEmailVerification.ICreate>,
): IMultiUserTodoUserEmailVerification.ICreate {
  return {
    multiUserTodoUserId:
      input?.multiUserTodoUserId ??
      typia.random<string & tags.Format<"uuid">>(),
    token: input?.token ?? RandomGenerator.alphaNumeric(32),
  };
}
