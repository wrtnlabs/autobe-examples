import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function test_api_community_creation_duplicate_name(
  connection: api.IConnection,
) {
  // Step 1: Create the first user to create the first community
  const user1Join = {
    email: "user1@example.com",
    password: "password123",
    username: "user1_tester",
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user1: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: user1Join,
    });
  typia.assert(user1);

  // Step 2: Create the first community with a specific name
  const communityName = "duplicate_test_community";
  const communityCreate = {
    name: communityName,
    slug: "duplicate-test-community",
    title: "Duplicate Test Community",
    description: "A community to test duplicate name validation",
    rules: "No duplicate names allowed",
    privacy_level: "public",
    status: "active",
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community1: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: communityCreate,
    });
  typia.assert(community1);

  // Step 3: Create a second user to attempt creating a community with the same name
  const user2Join = {
    email: "user2@example.com",
    password: "password123",
    username: "user2_tester",
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user2: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: user2Join,
    });
  typia.assert(user2);

  // Step 4: Attempt to create a second community with the same name (should fail)
  await TestValidator.error(
    "should reject duplicate community name",
    async () => {
      await api.functional.communityForum.user.communities.create(connection, {
        body: {
          ...communityCreate,
          slug: "duplicate-test-community-2", // Different slug to ensure we're testing name duplication
        },
      });
    },
  );
}
