import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_multi_user_todo_member_email_verification(
  input?:
    | DeepPartial<IMultiUserTodoMemberEmailVerification.ICreate>
    | undefined,
): IMultiUserTodoMemberEmailVerification.ICreate {
  return {
    token: input?.token ?? RandomGenerator.alphaNumeric(32),
  };
}
