import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function test_api_community_update_unauthorized_user(
  connection: api.IConnection,
) {
  // Step 1: Create first user via join
  const user1JoinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    username:
      RandomGenerator.name(1).replace(/\s+/g, "_").toLowerCase() + "_user1",
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user1: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: user1JoinData,
    });
  typia.assert(user1);

  // Step 2: Create a community with first user
  const communityCreateData = {
    name:
      RandomGenerator.name(2).replace(/\s+/g, "-").toLowerCase() + "-community",
    slug:
      RandomGenerator.name(1).replace(/\s+/g, "-").toLowerCase() +
      "-" +
      RandomGenerator.alphaNumeric(6),
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
      body: communityCreateData,
    });
  typia.assert(community);

  // Step 3: Create second user via join
  const user2JoinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    username:
      RandomGenerator.name(1).replace(/\s+/g, "_").toLowerCase() + "_user2",
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user2: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: user2JoinData,
    });
  typia.assert(user2);

  // Step 4: Attempt to update community as unauthorized user (user2)
  const communityUpdateData = {
    title: RandomGenerator.name(3) + " Updated",
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies ICommunityForumCommunityGroup.IUpdate;

  // This should fail since user2 is not the owner of the community
  await TestValidator.error(
    "unauthorized user cannot update community",
    async () => {
      await api.functional.communityForum.user.communities.update(connection, {
        communitySlug: community.slug,
        body: communityUpdateData,
      });
    },
  );
}
