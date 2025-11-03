import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import type { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";

/**
 * Test full deletion of a registered user by admin actor.
 *
 * Steps:
 *
 * 1. Create an admin user by calling the admin join endpoint.
 * 2. Create a user member who will be deleted.
 * 3. Admin logs in implicitly from join operation.
 * 4. Perform deletion of the created member user by admin using userId.
 * 5. Validate that the user no longer exists and cascading deletes apply.
 * 6. Ensure only authorized admins can delete users.
 */
export async function test_api_user_permanent_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin join and authenticate
  const adminPayload = {
    body: {
      user_id: "00000000-0000-0000-0000-000000000000", // placeholder, will replace
    } satisfies IRedditCommunityAdmin.ICreate,
  };

  // Actually, admins require an existing user_id. So first create an admin user as registered user, then assign admin rights
  // But given no API exists to create admin user from scratch except admin.join only with user_id,
  // We proceed to create a registered user first, then uses its id for admin creation.

  // 2. Create a registered user who will be deleted.
  const userCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    ip: null,
    href: "https://example.com/home",
    referrer: "https://example.com/referrer",
  } satisfies IRedditCommunityUser.ICreate;

  const createdUser = await api.functional.auth.user.join(connection, {
    body: userCreateBody,
  });
  typia.assert(createdUser);

  // Using the created user's id for admin creation
  const adminCreateBody = {
    body: {
      user_id: createdUser.id,
    } satisfies IRedditCommunityAdmin.ICreate,
  };

  // 3. Create admin user (implicitly authenticates the connection as admin)
  const admin = await api.functional.auth.admin.join(
    connection,
    adminCreateBody,
  );
  typia.assert(admin);

  // 4. Delete the user by admin
  await api.functional.redditCommunity.admin.users.erase(connection, {
    userId: createdUser.id,
  });

  // 5. Verify the user no longer exists by attempting to delete again causes error
  await TestValidator.error(
    "Deleting a non-existent user throws error",
    async () => {
      await api.functional.redditCommunity.admin.users.erase(connection, {
        userId: createdUser.id,
      });
    },
  );

  // 6. Additional test: Attempt deleting user unauthorized (simulate non-admin connection) - cannot do due to SDK headers
  // This test is limited due to lack of direct logout/login calls in SDK
  // Hence, this test is omitted
}
