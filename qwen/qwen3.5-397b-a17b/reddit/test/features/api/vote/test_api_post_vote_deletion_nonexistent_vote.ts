import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImageContent";
import type { IRedditCommunityPostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostLinkContent";
import type { IRedditCommunityPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostTextContent";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_member_subscriptions_create";
import { generate_random_reddit_community_posts_create } from "../../../generate/generate_random_reddit_community_posts_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

/**
 * Test vote deletion with non-existent vote ID.
 *
 * Validates that the system properly handles attempts to delete votes that do not exist. The test creates a complete context including member registration, community creation, subscription, and post creation, then attempts to delete a vote using a randomly generated UUID that does not correspond to any existing vote record.
 *
 * The test ensures that the API returns a 404 Not Found error when attempting to delete a non-existent vote, demonstrating proper error handling and resource validation. This prevents potential security issues from information leakage about vote existence.
 *
 * 1. Member registers with randomized credentials via authorize_member_join.
 * 2. Member creates a community they own via generate_random_reddit_community_member_communities_create.
 * 3. Member subscribes to their own community via generate_random_reddit_community_member_member_subscriptions_create.
 * 4. Member creates a text post in the community via generate_random_reddit_community_posts_create.
 * 5. Generate a random UUID that does not match any existing vote.
 * 6. Attempt DELETE /redditCommunity/member/posts/{postId}/votes/{randomVoteId} and validate 404 response.
 */
export async function test_api_post_vote_deletion_nonexistent_vote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member and get authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create community owned by the member
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {},
    );
  // 3. Subscribe member to their own community
  await generate_random_reddit_community_member_member_subscriptions_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  // 4. Create a text post in the community
  const post = await generate_random_reddit_community_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        community_id: community.id,
        body: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  // 5. Generate a random UUID that does not correspond to any existing vote
  const nonExistentVoteId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 6. Attempt to delete the non-existent vote - should return 404
  await TestValidator.httpError(
    "delete non-existent vote returns 404",
    404,
    async () => {
      await api.functional.redditCommunity.member.posts.votes.erase(
        memberConnection,
        {
          postId: post.id,
          voteId: nonExistentVoteId,
        },
      );
    },
  );
}
