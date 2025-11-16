import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Test user deletion of a profile image history record with an invalid or
 * non-existent identifier.
 *
 * This test ensures that the API properly declines deletion attempts when the
 * profileImageHistoryId does not exist. The process:
 *
 * 1. Register a user to acquire authentication.
 * 2. Attempt to delete a profile image history record with a random UUID that does
 *    not belong to the user.
 * 3. Validate that an error is returned (e.g. Not Found or Forbidden) and no
 *    records are affected.
 */
export async function test_api_profile_image_history_delete_invalid_id_by_user(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.Format<"password">>();
  const user: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(user);

  // 2. Attempt to delete profile image history record with a random (invalid) UUID
  const invalidProfileImageHistoryId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "should fail to delete a non-existent profile image history record",
    async () => {
      await api.functional.communityPlatform.user.users.profileImageHistory.erase(
        connection,
        {
          userId: user.id,
          profileImageHistoryId: invalidProfileImageHistoryId,
        },
      );
    },
  );
}
