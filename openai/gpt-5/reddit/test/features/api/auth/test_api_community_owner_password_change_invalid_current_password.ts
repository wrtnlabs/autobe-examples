import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityOwner";

export async function test_api_community_owner_password_change_invalid_current_password(
  connection: api.IConnection,
) {
  /**
   * Validate failure on incorrect current password when changing password.
   *
   * Steps:
   *
   * 1. Register a new community owner via join (receives IAuthorized; SDK sets
   *    token automatically).
   * 2. Attempt to change password with an incorrect current_password and any
   *    new_password → expect failure.
   * 3. Immediately change password with the correct current_password to confirm
   *    the original token/session remains valid after the failed attempt.
   * 4. On success, assert identity consistency by comparing user id from both
   *    authorization responses.
   */

  // 1) Register community owner
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(12), // matches ^[A-Za-z0-9_]{3,20}$
    password: RandomGenerator.alphaNumeric(12), // 8-64 chars
    display_name: RandomGenerator.name(1),
    terms_accepted_at: new Date().toISOString(),
    privacy_accepted_at: new Date().toISOString(),
    // avatar_uri optional; skip to keep payload minimal and compliant
  } satisfies ICommunityPlatformCommunityOwner.ICreate;

  const authorized = await api.functional.auth.communityOwner.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // 2) Attempt changePassword with wrong current password → expect error
  const wrongChangeBody = {
    current_password: `${joinBody.password}x`, // wrong credential
    new_password: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformCommunityOwner.IChangePassword;

  await TestValidator.error(
    "changing password with wrong current_password must fail",
    async () => {
      await api.functional.auth.communityOwner.password.changePassword(
        connection,
        { body: wrongChangeBody },
      );
    },
  );

  // 3) Now changePassword with correct current password → expect success
  const correctChangeBody = {
    current_password: joinBody.password,
    new_password: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformCommunityOwner.IChangePassword;

  const authorizedAfter =
    await api.functional.auth.communityOwner.password.changePassword(
      connection,
      { body: correctChangeBody },
    );
  typia.assert(authorizedAfter);

  // 4) Identity should remain the same across authorization objects
  TestValidator.equals(
    "identity unchanged after successful password change",
    authorizedAfter.id,
    authorized.id,
  );
}
