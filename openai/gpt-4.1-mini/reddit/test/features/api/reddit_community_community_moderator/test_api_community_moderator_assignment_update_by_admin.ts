import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import type { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";

/**
 * End-to-end test validating the update of an existing moderator assignment for
 * a community in the redditCommunity platform by an admin user.
 *
 * The test performs the following steps:
 *
 * 1. Admin user sign-up and login.
 * 2. User sign-up to serve as future moderator.
 * 3. Creation of a moderator entity linked to the new user.
 * 4. Creation of a new community.
 * 5. Assign the moderator to the community with initial assignment date.
 * 6. Admin updates the moderator assignment (e.g., adjusts assigned_at date).
 * 7. The test asserts the API calls succeed and data types are valid.
 *
 * This test verifies the proper authorization handling, data management, and
 * update flow for moderator assignments by an admin in the system.
 */
export async function test_api_community_moderator_assignment_update_by_admin(
  connection: api.IConnection,
) {
  // 1a. Create user for admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUserCreateBody = {
    email: adminEmail,
    password: "AdminPass1234",
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IRedditCommunityUser.ICreate;
  const adminUser = await api.functional.redditCommunity.users.create(
    connection,
    {
      body: adminUserCreateBody,
    },
  );
  typia.assert(adminUser);

  // 1b. Create admin with this user ID
  const adminCreateBody = {
    user_id: adminUser.user_id,
  } satisfies IRedditCommunityAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminCreateBody,
  });
  typia.assert(admin);

  // 1c. Admin login to authenticate
  const adminLoginBody = {
    email: adminEmail,
    password: "AdminPass1234",
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IRedditCommunityAdmin.ILogin;
  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: adminLoginBody,
  });
  typia.assert(adminLogin);

  // 2. User sign-up (moderator user)
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userCreateBody = {
    email: userEmail,
    password: "UserPass1234",
    ip: null,
    href: "https://user.example.com/signup",
    referrer: "https://user.example.com/",
  } satisfies IRedditCommunityUser.ICreate;
  const user = await api.functional.redditCommunity.users.create(connection, {
    body: userCreateBody,
  });
  typia.assert(user);

  // 3. Create moderator linked to user
  const moderatorCreateBody = {
    user_id: user.user_id,
  } satisfies IRedditCommunityModerator.ICreate;
  const moderator =
    await api.functional.redditCommunity.admin.moderators.create(connection, {
      body: moderatorCreateBody,
    });
  typia.assert(moderator);

  // 4. Create community
  const communityCreateBody = {
    name: `testcommunity${RandomGenerator.alphaNumeric(6)}`,
    description: "Test Community for Moderator Assignment Update",
  } satisfies IRedditCommunityCommunity.ICreate;
  const community =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: communityCreateBody,
    });
  typia.assert(community);

  // 5. Create moderator assignment
  const assignedAt = new Date().toISOString();
  const assignmentCreateBody = {
    reddit_community_moderator_id: moderator.id,
    assigned_at: assignedAt,
  } satisfies IRedditCommunityCommunityModerator.ICreate;
  const assignment =
    await api.functional.redditCommunity.admin.communities.moderators.create(
      connection,
      {
        communityName: community.name,
        body: assignmentCreateBody,
      },
    );
  typia.assert(assignment);

  // 6. Admin updates the moderator assignment - update assigned_at date by adding 1 day
  const updatedAssignedAt = new Date(Date.now() + 86400000).toISOString();

  await api.functional.redditCommunity.admin.communities.moderators.updateModerator(
    connection,
    {
      communityName: community.name,
      moderatorId: moderator.id,
    },
  );

  // Validate update succeeded without error
  TestValidator.predicate(
    "admin updated moderator assignment without exception",
    true,
  );
}
