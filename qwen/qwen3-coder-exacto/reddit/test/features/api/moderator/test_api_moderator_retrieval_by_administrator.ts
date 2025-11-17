import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityAdministrator";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityModerator";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function test_api_moderator_retrieval_by_administrator(
  connection: api.IConnection,
) {
  // Step 1: Create a regular user who will become a moderator
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    username:
      RandomGenerator.name(1).replace(/\s+/g, "_").toLowerCase() +
      "_" +
      RandomGenerator.alphaNumeric(5),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoinBody satisfies ICommunityForumCommunityUser.IJoin,
    });
  typia.assert(user);

  // Step 2: Create a community that will have moderators
  const communityBody = {
    name:
      RandomGenerator.name(2).replace(/\s+/g, "-").toLowerCase() +
      "-" +
      RandomGenerator.alphaNumeric(5),
    slug:
      RandomGenerator.name(2).replace(/\s+/g, "-").toLowerCase() +
      "-" +
      RandomGenerator.alphaNumeric(5),
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    rules: RandomGenerator.paragraph({ sentences: 3 }),
    privacy_level: RandomGenerator.pick([
      "public",
      "private",
      "restricted",
    ] as const),
    status: "active",
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: communityBody satisfies ICommunityForumCommunityGroup.ICreate,
    });
  typia.assert(community);

  // Step 3: Register user as a moderator for the community
  const moderatorBody = {
    community_forum_user_id: user.id,
  } satisfies ICommunityForumCommunityModerator.ICreate;

  const moderator: ICommunityForumCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorBody satisfies ICommunityForumCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 4: Create administrator user for the platform
  // First create the admin user account
  const adminUserBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "adminpassword123",
    username:
      RandomGenerator.name(1).replace(/\s+/g, "_").toLowerCase() +
      "_admin_" +
      RandomGenerator.alphaNumeric(5),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const adminUser: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: adminUserBody satisfies ICommunityForumCommunityUser.IJoin,
    });
  typia.assert(adminUser);

  // Then register as administrator
  const adminRegisterBody = {
    community_forum_user_id: adminUser.id,
    role: "system_admin",
  } satisfies ICommunityForumCommunityAdministrator.ICreate;

  const admin: ICommunityForumCommunityAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminRegisterBody satisfies ICommunityForumCommunityAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 5: Login as administrator to get proper authorization context
  const adminLoginBody = {
    email: adminUserBody.email,
    password: adminUserBody.password,
    href: "http://localhost:3000/admin",
    referrer: "http://localhost:3000/login",
  } satisfies ICommunityForumCommunityAdministrator.ILogin;

  const adminLogin: ICommunityForumCommunityAdministrator.IAuthorized =
    await api.functional.auth.administrator.login(connection, {
      body: adminLoginBody satisfies ICommunityForumCommunityAdministrator.ILogin,
    });
  typia.assert(adminLogin);

  // Step 6: Administrator retrieves moderator information
  const retrievedModerator: ICommunityForumCommunityModerator =
    await api.functional.communityForum.administrator.moderators.at(
      connection,
      {
        moderatorId: moderator.id,
      },
    );
  typia.assert(retrievedModerator);

  // Validate that the retrieved moderator data matches what we created
  TestValidator.equals(
    "moderator ID matches",
    retrievedModerator.id,
    moderator.id,
  );
  TestValidator.equals(
    "moderator user ID matches",
    retrievedModerator.community_forum_user_id,
    user.id,
  );
  TestValidator.equals(
    "moderator user details match",
    retrievedModerator.user.id,
    user.id,
  );
  TestValidator.equals(
    "moderator username matches",
    retrievedModerator.user.username,
    user.username,
  );
}
