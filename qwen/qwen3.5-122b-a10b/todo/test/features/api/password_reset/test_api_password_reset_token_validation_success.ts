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

/**
 * Test password reset token validation success scenario.
 *
 * Validates the primary success path of the password reset workflow where a member receives a valid token via email and clicks the reset link. The system must confirm the token exists, has not expired, and has not been used before allowing the password reset flow to proceed.
 *
 * This test verifies that:
 * 1. A valid member account exists in the system
 * 2. The password reset token validation endpoint accepts a valid token ID
 * 3. The response contains correct metadata about the token lifecycle
 * 4. The actual token value is never exposed in the response for security
 *
 * 1. Register a new member account with randomized credentials.
 * 2. Generate a valid password reset token ID in UUID format.
 * 3. Call the password reset validation endpoint with the token ID.
 * 4. Validate the response structure and token metadata.
 * 5. Verify the valid flag is true and used_at is null.
 */
export async function test_api_password_reset_token_validation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ITodoAppMember.IAuthorized =
    await api.functional.todoApp.auth.member.join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ITodoAppMember.IJoin,
    });
  typia.assert(member);
  // 2. Generate a valid password reset token ID
  const resetId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Validate the password reset token
  const validation: ITodoAppMemberPasswordReset.IValidation =
    await api.functional.todoApp.member.password_resets.at(memberConnection, {
      resetId,
    });
  typia.assert(validation);
  // 4. Validate response structure and token metadata
  TestValidator.equals("valid flag is true", validation.valid, true);
  TestValidator.equals("used_at is null", validation.used_at, null);
  TestValidator.predicate("expires_at is valid date-time", () => {
    const date = new Date(validation.expires_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("created_at is valid date-time", () => {
    const date = new Date(validation.created_at);
    return !isNaN(date.getTime());
  });
  // 5. Verify token expiration is after creation
  TestValidator.predicate(
    "expires_at is after created_at",
    new Date(validation.expires_at) > new Date(validation.created_at),
  );
}
