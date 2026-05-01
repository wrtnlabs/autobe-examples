import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_todo_app_member_password_reset } from "../prepare/prepare_random_todo_app_member_password_reset";

/**
 * Generate a random password reset request via the API for E2E testing.
 *
 * Uses the prepare function to generate a random email address in valid email
 * format, then calls the password reset endpoint. The API always returns a void
 * success response regardless of whether the email is registered, as a security
 * measure to prevent user enumeration attacks.
 *
 * The body parameter allows tests to override the generated email with a
 * specific value for testing scenarios such as invalid email format,
 * unregistered emails, or verification of the uniform response behavior.
 *
 * @param connection API connection information
 * @param props.body Optional partial body to override the generated email
 * @returns Void — the API never exposes whether the email was found
 */
export async function generate_random_todo_app_password_resets_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ITodoAppMemberPasswordReset.ICreate>;
  },
): Promise<void> {
  const prepared: ITodoAppMemberPasswordReset.ICreate =
    prepare_random_todo_app_member_password_reset(props.body);
  await api.functional.todoApp.password_resets.create(connection, {
    body: prepared,
  });
}
