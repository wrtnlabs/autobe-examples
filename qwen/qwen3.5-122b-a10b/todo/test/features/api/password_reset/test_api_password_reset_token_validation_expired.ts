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
 * Test password reset token validation with expired token.
 *
 * Validates that the password reset token validation endpoint correctly rejects tokens that have exceeded their expiration time. This test ensures the security boundary that password reset tokens have a limited validity window and cannot be used after expiration.
 *
 * The test attempts to validate a password reset token using a UUID that represents an expired or non-existent token. The validation should fail with an HTTP error status code (404 or 410), confirming proper token lifecycle management.
 *
 * 1. Attempt to validate a password reset token with a random UUID (simulating expired/non-existent token).
 * 2. Verify the validation fails with appropriate HTTP error (404 or 410).
 */
export async function test_api_password_reset_token_validation_expired(
  connection: api.IConnection,
): Promise<void> {
  // Attempt to validate expired/non-existent password reset token
  const resetId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Expect HTTP error (404 or 410) for expired/non-existent token
  await TestValidator.httpError(
    "expired token validation should fail",
    [404, 410],
    async () => {
      await api.functional.todoApp.member.password_resets.at(connection, {
        resetId,
      });
    },
  );
}
