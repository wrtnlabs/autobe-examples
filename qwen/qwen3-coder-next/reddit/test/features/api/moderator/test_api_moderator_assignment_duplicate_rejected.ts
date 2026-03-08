import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModeratorRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_moderators_create } from "../../../generate/generate_random_reddit_like_member_communities_moderators_create";
import { prepare_random_reddit_like_moderator_role } from "../../../prepare/prepare_random_reddit_like_moderator_role";

export async function test_api_moderator_assignment_duplicate_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register community owner (user1)
  const user1Connection: api.IConnection = { host: connection.host };
  const user1 = await authorize_member_join(user1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(user1);
  // 2. Register target user (user2) who will be assigned as moderator
  const user2Connection: api.IConnection = { host: connection.host };
  const user2 = await authorize_member_join(user2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(user2);
  // 3. Use an existing community (the scenario's PATCH endpoint is for listing only)
  const communityName = `test-community-${RandomGenerator.alphaNumeric(6)}`;
  const searchResponse = await api.functional.redditLike.communities.index(
    user1Connection,
    {
      body: {
        search: communityName,
        sort: "newest",
        subscriptionStatus: "all",
        page: 1,
        limit: 10,
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(searchResponse);
  // Get an existing community for testing
  let community = searchResponse.data.find((c) => c.name === communityName);
  // If target community doesn't exist, use first available community
  if (!community && searchResponse.data.length > 0) {
    community = searchResponse.data[0];
  }
  // If no community exists, we cannot proceed with this test
  if (!community) {
    throw new Error(
      "No community available for testing. Please ensure at least one community exists in the test environment.",
    );
  }
  // 4. Successfully assign user2 as moderator (first assignment)
  const firstAssignment =
    await api.functional.redditLike.member.communities.moderators.create(
      user1Connection,
      {
        communityName: community.name,
        body: {
          user_id: user2.id,
          community_id: community.id,
          role: "moderator",
        } satisfies IRedditLikeModeratorRole.ICreate,
      },
    );
  typia.assert(firstAssignment);
  // Verify first assignment was successful
  TestValidator.equals(
    "moderator user_id matches",
    firstAssignment.user_id,
    user2.id,
  );
  TestValidator.equals(
    "moderator community_id matches",
    firstAssignment.community_id,
    community.id,
  );
  TestValidator.equals(
    "moderator role is moderator",
    firstAssignment.role,
    "moderator",
  );
  // 5. Attempt second assignment of same user as moderator (should fail)
  await TestValidator.error(
    "duplicate moderator assignment rejected",
    async () => {
      await api.functional.redditLike.member.communities.moderators.create(
        user1Connection,
        {
          communityName: community.name,
          body: {
            user_id: user2.id,
            community_id: community.id,
            role: "moderator",
          } satisfies IRedditLikeModeratorRole.ICreate,
        },
      );
    },
  );
}
