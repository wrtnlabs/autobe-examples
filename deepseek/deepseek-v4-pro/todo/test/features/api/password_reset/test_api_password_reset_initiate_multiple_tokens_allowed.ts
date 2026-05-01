import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_todo_app_password_resets_create } from "../../../generate/generate_random_todo_app_password_resets_create";
import { prepare_random_todo_app_member_password_reset } from "../../../prepare/prepare_random_todo_app_member_password_reset";

/**
 * Test that multiple password reset requests for the same email are not rejected.
 *
 * Verifies that the password reset endpoint supports a one-to-many relationship
 * between members and reset tokens. A registered member submits two consecutive
 * password reset requests using the same email address, and both must complete
 * without errors.
 *
 * The system must not rate-limit or reject repeated reset requests at the API
 * level. Expired or superseded tokens remain in the database for audit purposes,
 * and the endpoint's uniform void response prevents user enumeration attacks
 * regardless of whether the email is registered.
 *
 * 1. Register a new member account with a unique email and password.
 * 2. Submit the first password reset request for the member's email.
 * 3. Submit the second password reset request for the same email.
 * 4. Verify both requests complete without errors, confirming multiple
 *    concurrent reset tokens are allowed for the same member.
 */
export async function test_api_password_reset_initiate_multiple_tokens_allowed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a registered member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // 2. Submit first password reset request for the member's email
  const resetConnection: api.IConnection = { host: connection.host };
  await generate_random_todo_app_password_resets_create(resetConnection, {
    body: { email: member.email },
  });
  // 3. Submit second password reset request for the same email
  await generate_random_todo_app_password_resets_create(resetConnection, {
    body: { email: member.email },
  });
  // Both calls returned void — the system allows multiple concurrent reset
  // tokens for the same member without rate-limiting or rejection.
}
