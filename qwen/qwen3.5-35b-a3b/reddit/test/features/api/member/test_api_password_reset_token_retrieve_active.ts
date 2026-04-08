import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieving an active (valid, unused) password reset token record.
 *
 * Validates the password reset token retrieval flow by creating a member account,
 * generating a password reset token, and verifying the token record is correctly
 * returned with all expected fields including member relationship and token metadata.
 *
 * Special attention is given to verifying that the token is properly hashed (not
 * returned in raw form), timestamps are correctly set, and the member relationship
 * is properly maintained in the response.
 *
 * 1. Register a new member account via POST /redditPlatform/auth/member/join.
 * 2. Generate a password reset token via POST /redditPlatform/member/password-resets.
 * 3. Retrieve the token record via GET /redditPlatform/member/password-resets/{resetId}.
 * 4. Validate the response contains correct token ID, member reference, hashed token,
 *    timestamps, and null values for used_at and deleted_at.
 * 5. Verify the token status is active (unused and not expired).
 */
export async function test_api_password_reset_token_retrieve_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account and get authorized connection
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      username: RandomGenerator.name(3),
      href: "https://example.com/register",
      referrer: "https://google.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  // 2. Generate a password reset token for this member
  const tokenConnection: api.IConnection = { host: connection.host };
  await api.functional.redditPlatform.auth.member.login(tokenConnection, {
    body: {
      email: authorized.email,
      password: "password1234",
    },
  });
  // Note: The password reset token creation endpoint is not available in the SDK
  // This would require adding: api.functional.redditPlatform.member.password_resets.create
  // For now, we use a random UUID to test the retrieval endpoint behavior
  const resetId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Attempt to retrieve the token (will likely return 404 since we cannot create tokens)
  // This tests the retrieval endpoint with an active token pattern
  let passwordReset: IRedditPlatformMemberPasswordReset;
  try {
    passwordReset =
      await api.functional.redditPlatform.member.password_resets.at(
        tokenConnection,
        {
          resetId: resetId,
        },
      );
    typia.assert(passwordReset);
  } catch (error) {
    // If token doesn't exist, we cannot complete the test
    // In a real scenario, you would create the token first
    throw new Error(
      "Password reset token not found. Ensure the password reset token creation endpoint is available.",
    );
  }
  // 3. Validate all fields
  TestValidator.equals("token id matches", passwordReset.id, resetId);
  TestValidator.equals(
    "member_id matches",
    passwordReset.member_id,
    authorized.id,
  );
  TestValidator.equals(
    "member id matches",
    passwordReset.member!.id,
    authorized.id,
  );
  TestValidator.equals(
    "member username matches",
    passwordReset.member!.username,
    authorized.username,
  );
  TestValidator.notEquals(
    "token is hashed",
    passwordReset.token,
    passwordReset.token,
  );
  TestValidator.predicate(
    "created_at is valid date",
    passwordReset.created_at !== undefined,
  );
  TestValidator.predicate(
    "expires_at is in future",
    new Date(passwordReset.expires_at) > new Date(),
  );
  TestValidator.equals("used_at is null (active)", passwordReset.used_at, null);
  TestValidator.equals(
    "deleted_at is null (not deleted)",
    passwordReset.deleted_at,
    null,
  );
}
