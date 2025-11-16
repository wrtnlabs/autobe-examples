import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Verify that updating a member user by username fails when the target username
 * does not exist.
 *
 * Business intent:
 *
 * - Ensure that PUT /communityPlatform/memberUser/memberUsers/{username} treats
 *   the `username` path parameter as a strict lookup key.
 * - When no member user with the given username exists, the API must return an
 *   error instead of silently creating a new account or updating some unrelated
 *   record.
 * - The test uses a valid authenticated memberUser actor so that any failure is
 *   due to the non-existent username, not due to missing authentication.
 *
 * Test flow:
 *
 * 1. Call POST /auth/memberUser/join to register a new memberUser and establish
 *    authentication.
 *
 *    - Use typia.random<ICommunityPlatformMemberuser.IJoin>() to generate a valid
 *         join payload.
 *    - Assert the response as ICommunityPlatformMemberuser.IAuthorized.
 * 2. Derive a guaranteed non-existent username by appending a random suffix to the
 *    real username returned from the join step.
 * 3. Build a valid ICommunityPlatformMemberuser.IUpdate payload using
 *    typia.random.
 * 4. Call PUT /communityPlatform/memberUser/memberUsers/{username} with the
 *    non-existent username and the update payload, wrapped in
 *    TestValidator.error, to assert that an error is thrown.
 *
 *    - This ensures that the endpoint does not succeed or implicitly create a new
 *         member.
 */
export async function test_api_member_user_update_not_found_username(
  connection: api.IConnection,
) {
  // 1. Register a new memberUser and authenticate the connection
  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: typia.random<ICommunityPlatformMemberuser.IJoin>(),
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorized);

  // 2. Construct a username that is extremely unlikely to exist
  const nonexistentUsername: string = `${authorized.username}__nonexistent__${RandomGenerator.alphaNumeric(16)}`;

  // 3. Prepare a valid update payload
  const updateBody = typia.random<ICommunityPlatformMemberuser.IUpdate>();

  // 4. Attempt to update the non-existent member user and expect an error
  await TestValidator.error(
    "update with non-existent username must fail",
    async () => {
      await api.functional.communityPlatform.memberUser.memberUsers.update(
        connection,
        {
          username: nonexistentUsername,
          body: updateBody,
        },
      );
    },
  );
}
