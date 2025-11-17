import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function test_api_community_delete_unauthorized_user(
  connection: api.IConnection,
) {
  // Step 1: Create first user who will own the community
  const firstUserJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    username:
      RandomGenerator.name(1).toLowerCase().replace(/\s+/g, "_") + "_owner",
  } satisfies ICommunityForumCommunityUser.IJoin;

  const firstUser: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: firstUserJoinBody,
    });
  typia.assert(firstUser);

  // Step 2: Create a community with the first user
  const communityCreateBody = {
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
    privacy_level: RandomGenerator.pick([
      "public",
      "private",
      "restricted",
    ] as const),
    status: "active",
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: communityCreateBody,
    });
  typia.assert(community);

  // Step 3: Create second user who will attempt unauthorized deletion
  const secondUserJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    username:
      RandomGenerator.name(1).toLowerCase().replace(/\s+/g, "_") +
      "_unauthorized",
  } satisfies ICommunityForumCommunityUser.IJoin;

  const secondUser: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: secondUserJoinBody,
    });
  typia.assert(secondUser);

  // Step 4: Attempt to delete the community as the unauthorized user (second user)
  // This should fail with an authorization error
  await TestValidator.error(
    "unauthorized user cannot delete community",
    async () => {
      await api.functional.communityForum.user.communities.erase(connection, {
        communitySlug: community.slug,
      });
    },
  );
}
