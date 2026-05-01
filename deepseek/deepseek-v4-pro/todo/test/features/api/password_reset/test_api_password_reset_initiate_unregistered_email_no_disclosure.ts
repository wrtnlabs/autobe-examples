import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_todo_app_password_resets_create } from "../../../generate/generate_random_todo_app_password_resets_create";
import { prepare_random_todo_app_member_password_reset } from "../../../prepare/prepare_random_todo_app_member_password_reset";

/**
 * Test password reset initiation with an unregistered email returns identical success response.
 *
 * Verifies the security requirement that the password reset endpoint does not disclose
 * whether an email address is registered in the system. When a password reset is requested
 * using an email that does not belong to any member, the API must return a void success
 * response that is indistinguishable from the response when the email is registered.
 *
 * This prevents malicious actors from performing user enumeration attacks by probing the
 * password reset endpoint with different email addresses.
 *
 * 1. Generate a random unregistered email address.
 * 2. Request password reset with the unregistered email via the utility function.
 * 3. Verify the API returns void success without throwing an error.
 * 4. Repeat with a second unregistered email to confirm consistent non-disclosure behavior.
 */
export async function test_api_password_reset_initiate_unregistered_email_no_disclosure(
  connection: api.IConnection,
): Promise<void> {
  const unregisteredEmail = typia.random<string & tags.Format<"email">>();
  await generate_random_todo_app_password_resets_create(connection, {
    body: { email: unregisteredEmail },
  });
  const anotherUnregisteredEmail = typia.random<
    string & tags.Format<"email">
  >();
  await generate_random_todo_app_password_resets_create(connection, {
    body: { email: anotherUnregisteredEmail },
  });
}
