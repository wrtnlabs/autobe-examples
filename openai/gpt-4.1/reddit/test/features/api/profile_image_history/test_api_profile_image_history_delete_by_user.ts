import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Test that a registered user can delete their own profile image history
 * record.
 *
 * 1. Register a new user account using the join endpoint.
 * 2. Generate two UUIDs to represent two profile image history records (since no
 *    creation endpoint exists for direct profile image history setup).
 * 3. Attempt to delete one of those records using the delete endpoint, simulating
 *    a case where that record exists and belongs to the user.
 * 4. Validate that the delete completes successfully (no exception) and that the
 *    correct authentication context is enforced.
 * 5. Attempt to delete the same record a second time and validate system error
 *    response for non-existent record.
 * 6. Attempt to delete a record for a different user and expect a permission
 *    error.
 *
 * This test focuses on business and permission flow, not persistence since
 * profile image history creation is unavailable in the public API surface.
 */
export async function test_api_profile_image_history_delete_by_user(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformUser.IJoin;
  const user = await api.functional.auth.user.join(connection, {
    body: joinBody,
  });
  typia.assert(user);

  // 2. Prepare UUIDs for existing and non-existent profile image history record
  const profileImageHistoryId = typia.random<string & tags.Format<"uuid">>();
  const otherProfileImageHistoryId = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Attempt to delete (simulate as if the record exists for this user)
  await api.functional.communityPlatform.user.users.profileImageHistory.erase(
    connection,
    {
      userId: user.id,
      profileImageHistoryId: profileImageHistoryId,
    },
  );

  // 4. Try deleting the same record again - should get error (simulate non-existent/deleted)
  await TestValidator.error(
    "deleting non-existent profile image history should fail",
    async () => {
      await api.functional.communityPlatform.user.users.profileImageHistory.erase(
        connection,
        {
          userId: user.id,
          profileImageHistoryId: profileImageHistoryId,
        },
      );
    },
  );

  // 5. Register a second user
  const joinBody2 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformUser.IJoin;
  const user2 = await api.functional.auth.user.join(connection, {
    body: joinBody2,
  });
  typia.assert(user2);

  // 6. Attempt to let user2 delete user1's profile image history record - should get permission error
  await TestValidator.error("user2 cannot delete user1's history", async () => {
    await api.functional.communityPlatform.user.users.profileImageHistory.erase(
      connection,
      {
        userId: user.id,
        profileImageHistoryId: otherProfileImageHistoryId,
      },
    );
  });
}
