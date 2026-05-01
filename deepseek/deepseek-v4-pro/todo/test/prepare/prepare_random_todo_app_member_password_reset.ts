import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random todo app member password reset creation data for E2E testing.
 *
 * Generates a complete ITodoAppMemberPasswordReset.ICreate with a randomized
 * email address. The email is generated in valid email format using typia's
 * random generator with Format<"email"> constraint.
 *
 * The input parameter allows tests to override the generated email with a
 * specific value for scenarios such as testing with registered, unregistered,
 * or malformed email addresses.
 *
 * For security, this function generates only the request body; the actual
 * password reset token is never exposed or returned here, matching the API's
 * design which prevents user enumeration attacks.
 */
export function prepare_random_todo_app_member_password_reset(
  input?: DeepPartial<ITodoAppMemberPasswordReset.ICreate>,
): ITodoAppMemberPasswordReset.ICreate {
  return {
    email: input?.email ?? typia.random<string & tags.Format<"email">>(),
  };
}
