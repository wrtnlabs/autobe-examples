import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityModerator";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function test_api_moderator_retrieval_by_moderator(
  connection: api.IConnection,
) {
  // Create first user who will become a moderator
  const user1Join = {
    email: "moderator1@test.com",
    password: "password123",
    username: "moderator1",
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user1: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: user1Join,
    });
  typia.assert(user1);

  // Create a community that will have moderators
  const communityCreate = {
    name: "Test Community",
    slug: "test-community",
    title: "Test Community Title",
    description: "A test community for moderator testing",
    rules: "Be respectful and follow the rules",
    privacy_level: "public" as const,
    status: "active" as const,
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: communityCreate,
    });
  typia.assert(community);

  // Register first user as a moderator for the community
  const moderator1Create = {
    community_forum_user_id: user1.id,
  } satisfies ICommunityForumCommunityModerator.ICreate;

  const moderator1: ICommunityForumCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderator1Create,
    });
  typia.assert(moderator1);

  // Create second user who will be the requesting moderator
  const user2Join = {
    email: "moderator2@test.com",
    password: "password123",
    username: "moderator2",
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user2: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: user2Join,
    });
  typia.assert(user2);

  // Register second user as a moderator
  const moderator2Create = {
    community_forum_user_id: user2.id,
  } satisfies ICommunityForumCommunityModerator.ICreate;

  const moderator2: ICommunityForumCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderator2Create,
    });
  typia.assert(moderator2);

  // Authenticate as the second moderator to retrieve the first moderator's information
  const moderator2Login = {
    email: "moderator2@test.com",
    password: "password123",
    ip: null,
    href: "http://localhost:3000/login",
    referrer: "http://localhost:3000/",
  } satisfies ICommunityForumCommunityModerator.ILogin;

  await api.functional.auth.moderator.login(connection, {
    body: moderator2Login,
  });

  // Retrieve the first moderator's information
  const retrievedModerator: ICommunityForumCommunityModerator =
    await api.functional.communityForum.moderator.moderators.at(connection, {
      moderatorId: moderator1.id,
    });
  typia.assert(retrievedModerator);

  // Validate that the retrieved moderator information matches what we expect
  TestValidator.equals(
    "retrieved moderator ID",
    retrievedModerator.id,
    moderator1.id,
  );
  TestValidator.equals(
    "retrieved moderator user ID",
    retrievedModerator.community_forum_user_id,
    user1.id,
  );
  TestValidator.equals(
    "retrieved moderator username",
    retrievedModerator.user.username,
    user1.username,
  );

  // Validate date-time fields have proper format
  TestValidator.predicate(
    "retrieved moderator created_at is valid date-time",
    typeof retrievedModerator.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
        retrievedModerator.created_at,
      ),
  );
  TestValidator.predicate(
    "retrieved moderator updated_at is valid date-time",
    typeof retrievedModerator.updated_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
        retrievedModerator.updated_at,
      ),
  );
}
