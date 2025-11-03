import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import type { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";

/**
 * Test community deletion operation by authorized admin user.
 *
 * Steps:
 *
 * 1. Register and authenticate a user account.
 * 2. Create an admin account linked to the user.
 * 3. Create a moderator linked to the user as admin.
 * 4. Create a new community to be deleted as user.
 * 5. Delete the community as the admin by community name.
 * 6. Validate deletion success and authorization enforcement.
 */
export async function test_api_community_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. User registration and authentication
  const userCreationBody = {
    email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "Password123!",
    href: "https://example.com/page",
    referrer: "https://example.com/referrer",
  } satisfies IRedditCommunityUser.ICreate;

  const user: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userCreationBody,
    });
  typia.assert(user);

  // 2. Admin creation (link to existing user)
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        user_id: user.id,
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(admin);

  // 3. Using admin auth to create moderator linked to user
  const moderator: IRedditCommunityModerator =
    await api.functional.redditCommunity.admin.moderators.create(connection, {
      body: {
        user_id: user.id,
      } satisfies IRedditCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // 4. Community creation as user
  const communityCreationBody = {
    name: `test_community_${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IRedditCommunityCommunity.ICreate;

  // Switch to user auth (already the current user token)
  await api.functional.auth.user.join(connection, {
    body: userCreationBody,
  });

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: communityCreationBody,
    });
  typia.assert(community);

  // 5. Delete community as admin
  // Switch to admin auth
  await api.functional.auth.admin.join(connection, {
    body: {
      user_id: user.id,
    } satisfies IRedditCommunityAdmin.ICreate,
  });

  await api.functional.redditCommunity.admin.communities.erase(connection, {
    communityName: community.name,
  });
}
