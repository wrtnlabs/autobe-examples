import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformProfileImageHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileImageHistory";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate retrieval of a user's profile image history record (detail).
 *
 * This test covers if an authenticated user (after registration) can fetch a
 * specific profile image history event for themselves by its id. Since actual
 * creation of the profile image history record is out of scope (test setup is
 * not responsible for creating it), we mock the acquisition of the id using
 * typia.random and focus the test on the correct usage of authorization,
 * endpoint, and response validation. Steps:
 *
 * 1. Register a new user and extract their id.
 * 2. Simulate existence of a profile image history record for this user by
 *    generating a profileImageHistoryId (uuid).
 * 3. As the user, call the profile image history detail endpoint with userId and
 *    profileImageHistoryId.
 * 4. Assert the response is a valid ICommunityPlatformProfileImageHistory
 *    structure and is logically linked to the user id.
 * 5. Confirm the main fields are present and match expectations, including audit
 *    timestamps and image_uri.
 */
export async function test_api_profile_image_history_retrieve_by_user(
  connection: api.IConnection,
) {
  // 1. Register a new user and authenticate
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformUser.IJoin;
  const user = await api.functional.auth.user.join(connection, {
    body: joinBody,
  });
  typia.assert(user);
  // 2. Simulate an existing profile image history record by generating a uuid
  const profileImageHistoryId = typia.random<string & tags.Format<"uuid">>();
  // 3. As the registered user, call the profile image history detail endpoint
  const detail =
    await api.functional.communityPlatform.user.users.profileImageHistory.at(
      connection,
      {
        userId: user.id,
        profileImageHistoryId: profileImageHistoryId,
      },
    );
  typia.assert(detail);
  // 4. Check the response matches the ICommunityPlatformProfileImageHistory structure
  TestValidator.equals(
    "community_platform_user_id matches user id",
    detail.community_platform_user_id,
    user.id,
  );
  TestValidator.predicate(
    "detail id is profileImageHistoryId uuid",
    detail.id === profileImageHistoryId,
  );
}
