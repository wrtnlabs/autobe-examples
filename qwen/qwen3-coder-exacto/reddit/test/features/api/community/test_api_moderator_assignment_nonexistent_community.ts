import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityAdministrator";
import type { ICommunityForumCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityModerator";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function test_api_moderator_assignment_nonexistent_community(
  connection: api.IConnection,
) {
  // Step 1: Create an administrator account to perform the moderator assignment
  const adminJoin = {
    email: "admin@example.com",
    password: "password123",
    username: "admin_user",
  } satisfies ICommunityForumCommunityUser.IJoin;

  const adminUser = await api.functional.auth.user.join(connection, {
    body: adminJoin,
  });
  typia.assert(adminUser);

  // Create administrator role for the user
  const adminCreate = {
    community_forum_user_id: adminUser.id,
    role: "system_admin",
  } satisfies ICommunityForumCommunityAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminCreate,
  });
  typia.assert(admin);

  // Step 2: Create a base user account for the moderator
  const moderatorJoin = {
    email: "moderator@example.com",
    password: "password123",
    username: "moderator_user",
  } satisfies ICommunityForumCommunityUser.IJoin;

  const moderatorUser = await api.functional.auth.user.join(connection, {
    body: moderatorJoin,
  });
  typia.assert(moderatorUser);

  // Step 3: Attempt to assign moderator to a non-existent community
  // Generate a random UUID for a non-existent community
  const nonexistentCommunityId = typia.random<string & tags.Format<"uuid">>();

  // Try to create a moderator for the non-existent community
  const moderatorCreate = {
    community_forum_user_id: moderatorUser.id,
  } satisfies ICommunityForumCommunityModerator.ICreate;

  await TestValidator.error(
    "should fail when assigning moderator to non-existent community",
    async () => {
      await api.functional.communityForum.administrator.communities.moderators.create(
        connection,
        {
          communityId: nonexistentCommunityId,
          body: moderatorCreate,
        },
      );
    },
  );
}
