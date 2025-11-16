import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate deletion behavior for banned or already-deleted memberUser accounts.
 *
 * ## Business intent
 *
 * This test exercises the member user lifecycle around moderation and account
 * removal. It ensures that:
 *
 * - A freshly joined memberUser can be marked as banned via the member-facing
 *   update endpoint.
 * - A banned account can be deleted using the DELETE
 *   /communityPlatform/memberUser/memberUsers/{username} endpoint.
 * - A subsequent delete against the same username behaves consistently: the test
 *   assumes that a second delete attempt results in an error rather than a
 *   silent success, so that callers cannot unknowingly operate on a
 *   non-existing account.
 *
 * Due to the limited API surface provided for this test (no login or profile
 * lookup endpoints beyond join and update), the scenario does not directly
 * validate post-deletion login or profile visibility. Instead it focuses on the
 * interaction between banning and deletion, and on double-deletion behavior.
 *
 * ## Steps
 *
 * 1. Join as a new memberUser via POST /auth/memberUser/join.
 *
 *    - Generate random but valid ICommunityPlatformMemberuser.IJoin payload.
 *    - Assert the response IAuthorized payload structure.
 *    - Capture the username and id for subsequent operations.
 * 2. Mark the account as banned via PUT
 *    /communityPlatform/memberUser/memberUsers/{username}.
 *
 *    - Use the username from step 1.
 *    - Send an ICommunityPlatformMemberuser.IUpdate body with `is_banned: true`.
 *    - Assert the returned ICommunityPlatformMemberuser and verify that
 *
 *         - Id and username stay the same.
 *         - Is_banned is true after the update.
 * 3. Perform the first delete via DELETE
 *    /communityPlatform/memberUser/memberUsers/{username}.
 *
 *    - Call erase with the same username.
 *    - Ensure the call completes without throwing (void response).
 * 4. Attempt a second delete on the same username.
 *
 *    - Wrap a second erase call in TestValidator.error.
 *    - Assert that an error is thrown, indicating that double deletion is not
 *         allowed and that the API behaves consistently for already-deleted or
 *         banned accounts.
 */
export async function test_api_member_user_delete_already_deleted_or_banned_account(
  connection: api.IConnection,
) {
  // 1. Join as a new member user
  const joinBody = typia.random<ICommunityPlatformMemberuser.IJoin>();

  const authorized = await api.functional.auth.memberUser.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorized);

  // Basic sanity checks on initial state
  TestValidator.equals(
    "joined username matches request",
    authorized.username,
    joinBody.username,
  );
  TestValidator.equals(
    "joined email matches request",
    authorized.email,
    joinBody.email,
  );
  TestValidator.equals(
    "new memberUser should not be banned initially",
    authorized.is_banned,
    false,
  );

  const username = authorized.username;

  // 2. Mark the account as banned
  const banned =
    await api.functional.communityPlatform.memberUser.memberUsers.update(
      connection,
      {
        username,
        body: {
          is_banned: true,
        } satisfies ICommunityPlatformMemberuser.IUpdate,
      },
    );
  typia.assert<ICommunityPlatformMemberuser>(banned);

  TestValidator.equals(
    "banned memberUser id should be unchanged",
    banned.id,
    authorized.id,
  );
  TestValidator.equals(
    "banned memberUser username should be unchanged",
    banned.username,
    authorized.username,
  );
  TestValidator.equals(
    "memberUser is_banned flag should be true after update",
    banned.is_banned,
    true,
  );

  // 3. First delete should succeed without error
  await api.functional.communityPlatform.memberUser.memberUsers.erase(
    connection,
    {
      username,
    },
  );

  // 4. Second delete should now fail, indicating consistent handling of
  //    already deleted accounts.
  await TestValidator.error(
    "second delete on the same username should result in an error",
    async () => {
      await api.functional.communityPlatform.memberUser.memberUsers.erase(
        connection,
        {
          username,
        },
      );
    },
  );
}
