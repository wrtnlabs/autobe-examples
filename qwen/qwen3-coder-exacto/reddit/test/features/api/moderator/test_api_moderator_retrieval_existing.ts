import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityAdministrator";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityModerator";
import type { ICommunityForumCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunitySubscription";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function test_api_moderator_retrieval_existing(
  connection: api.IConnection,
) {
  // Step 1: Create a base user account that will become a moderator
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    username: RandomGenerator.name(1).toLowerCase().replace(/\s+/g, "_"),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoinBody,
    });
  typia.assert(user);

  // Step 2: Create an administrator account
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "adminpassword123",
    username:
      RandomGenerator.name(1).toLowerCase().replace(/\s+/g, "_") + "_admin",
  } satisfies ICommunityForumCommunityUser.IJoin;

  const adminUser: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminUser);

  // Login as administrator
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    href: "http://localhost:3000",
    referrer: "http://localhost:3000",
  } satisfies ICommunityForumCommunityAdministrator.ILogin;

  const admin: ICommunityForumCommunityAdministrator.IAuthorized =
    await api.functional.auth.administrator.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(admin);

  // Step 3: Create a community
  const communityBody = {
    name: RandomGenerator.name(2).toLowerCase().replace(/\s+/g, "-"),
    slug:
      RandomGenerator.name(1).toLowerCase().replace(/\s+/g, "-") +
      "-" +
      RandomGenerator.alphaNumeric(5),
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
    rules: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 6 }),
    privacy_level: "public",
    status: "active",
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  // Step 4: Subscribe the user to the community before making them a moderator
  const subscription: ICommunityForumCommunitySubscription =
    await api.functional.communityForum.user.communities.subscriptions.create(
      connection,
      {
        communitySlug: community.slug,
      },
    );
  typia.assert(subscription);

  // Step 5: Assign the user as a moderator to the community
  const moderatorBody = {
    community_forum_user_id: user.id,
  } satisfies ICommunityForumCommunityModerator.ICreate;

  const moderator: ICommunityForumCommunityModerator =
    await api.functional.communityForum.administrator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: moderatorBody,
      },
    );
  typia.assert(moderator);

  // Step 6: Test successful retrieval of moderator information
  // Any user can retrieve moderator information, so we'll use the regular user connection
  const retrievedModerator: ICommunityForumCommunityModerator =
    await api.functional.communityForum.communities.moderators.at(connection, {
      communityId: community.id,
      moderatorId: moderator.id,
    });
  typia.assert(retrievedModerator);

  // Validate that the retrieved moderator matches the created moderator
  TestValidator.equals(
    "retrieved moderator ID matches created moderator ID",
    retrievedModerator.id,
    moderator.id,
  );

  TestValidator.equals(
    "retrieved moderator user ID matches created user ID",
    retrievedModerator.community_forum_user_id,
    user.id,
  );

  TestValidator.equals(
    "retrieved moderator username matches created user username",
    retrievedModerator.user.username,
    user.username,
  );

  // Validate that the created_at and updated_at timestamps are valid date-time strings
  TestValidator.predicate("moderator created_at is valid date-time", () =>
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(
      retrievedModerator.created_at,
    ),
  );

  TestValidator.predicate("moderator updated_at is valid date-time", () =>
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(
      retrievedModerator.updated_at,
    ),
  );
}
