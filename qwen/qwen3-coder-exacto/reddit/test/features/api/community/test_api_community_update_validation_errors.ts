import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function test_api_community_update_validation_errors(
  connection: api.IConnection,
) {
  // Step 1: Create a user via join for authentication
  const userJoin = {
    email: `${RandomGenerator.alphaNumeric(10)}@test.com`,
    password: "password123",
    username: RandomGenerator.alphaNumeric(8),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoin,
    });
  typia.assert(user);

  // Step 2: Create a community to be updated
  const communityCreate = {
    name: RandomGenerator.name(2).replace(/\s+/g, "-").toLowerCase(),
    slug: RandomGenerator.name(2).replace(/\s+/g, "-").toLowerCase(),
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph(),
    rules: RandomGenerator.paragraph(),
    privacy_level: "public",
    status: "active",
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: communityCreate,
    });
  typia.assert(community);

  // Step 3: Test validation errors with invalid data

  // Test 1: Empty name field
  await TestValidator.error("should reject empty name field", async () => {
    const updateData = {
      name: "",
    } satisfies ICommunityForumCommunityGroup.IUpdate;

    await api.functional.communityForum.user.communities.update(connection, {
      communitySlug: community.slug,
      body: updateData,
    });
  });

  // Test 2: Invalid privacy_level value
  await TestValidator.error(
    "should reject invalid privacy_level value",
    async () => {
      const updateData = {
        privacy_level: "invalid_level" as any,
      } satisfies ICommunityForumCommunityGroup.IUpdate;

      await api.functional.communityForum.user.communities.update(connection, {
        communitySlug: community.slug,
        body: updateData,
      });
    },
  );

  // Test 3: Invalid status value
  await TestValidator.error("should reject invalid status value", async () => {
    const updateData = {
      status: "invalid_status" as any,
    } satisfies ICommunityForumCommunityGroup.IUpdate;

    await api.functional.communityForum.user.communities.update(connection, {
      communitySlug: community.slug,
      body: updateData,
    });
  });

  // Test 4: Empty title field
  await TestValidator.error("should reject empty title field", async () => {
    const updateData = {
      title: "",
    } satisfies ICommunityForumCommunityGroup.IUpdate;

    await api.functional.communityForum.user.communities.update(connection, {
      communitySlug: community.slug,
      body: updateData,
    });
  });

  // Test 5: Empty slug field
  await TestValidator.error("should reject empty slug field", async () => {
    const updateData = {
      slug: "",
    } satisfies ICommunityForumCommunityGroup.IUpdate;

    await api.functional.communityForum.user.communities.update(connection, {
      communitySlug: community.slug,
      body: updateData,
    });
  });

  // Test 6: Very long name exceeding limits
  await TestValidator.error("should reject overly long name", async () => {
    const updateData = {
      name: RandomGenerator.alphabets(200),
    } satisfies ICommunityForumCommunityGroup.IUpdate;

    await api.functional.communityForum.user.communities.update(connection, {
      communitySlug: community.slug,
      body: updateData,
    });
  });
}
