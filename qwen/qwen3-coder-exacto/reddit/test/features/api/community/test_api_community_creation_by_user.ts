import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function test_api_community_creation_by_user(
  connection: api.IConnection,
) {
  // Step 1: Register a new user
  const userJoinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    username:
      RandomGenerator.name(1).replace(/\s+/g, "_").toLowerCase() +
      "_" +
      RandomGenerator.alphaNumeric(4),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoinData,
    });
  typia.assert(user);

  // Step 2: Create a community with the authenticated user
  const communityData = {
    name:
      RandomGenerator.name(2).replace(/\s+/g, "-").toLowerCase() +
      "-" +
      RandomGenerator.alphaNumeric(4),
    slug:
      RandomGenerator.name(1).replace(/\s+/g, "-").toLowerCase() +
      "-" +
      RandomGenerator.alphaNumeric(4),
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    rules: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    privacy_level: RandomGenerator.pick([
      "public",
      "private",
      "restricted",
    ] as const),
    status: "active",
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Validate the created community
  TestValidator.equals(
    "Community ID should be a valid UUID",
    community.id,
    community.id,
  );
  TestValidator.predicate(
    "Community ID should be a valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      community.id,
    ),
  );
  TestValidator.equals(
    "Community name should match",
    community.name,
    communityData.name,
  );
  TestValidator.equals(
    "Community slug should match",
    community.slug,
    communityData.slug,
  );
  TestValidator.equals(
    "Community title should match",
    community.title,
    communityData.title,
  );
  TestValidator.equals(
    "Community description should match",
    community.description,
    communityData.description,
  );
  TestValidator.equals(
    "Community rules should match",
    community.rules,
    communityData.rules,
  );
  TestValidator.equals(
    "Community privacy level should match",
    community.privacy_level,
    communityData.privacy_level,
  );
  TestValidator.equals(
    "Community status should be active",
    community.status,
    "active",
  );
  TestValidator.equals(
    "Community member count should be 1 (creator)",
    community.member_count,
    1,
  );
  TestValidator.equals(
    "Community post count should be 0",
    community.post_count,
    0,
  );
  TestValidator.equals(
    "Community creator ID should match user ID",
    community.created_by_id,
    user.id,
  );
  TestValidator.predicate("Community created_at should be a valid date", () => {
    const date = new Date(community.created_at);
    return date instanceof Date && !isNaN(date.getTime());
  });
  TestValidator.predicate("Community updated_at should be a valid date", () => {
    const date = new Date(community.updated_at);
    return date instanceof Date && !isNaN(date.getTime());
  });
  TestValidator.equals(
    "Community deleted_at should be undefined",
    community.deleted_at,
    undefined,
  );
  TestValidator.equals(
    "Community updated_by_id should match creator ID",
    community.updated_by_id,
    user.id,
  );
}
