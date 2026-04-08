import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_member_posts_votes_create } from "../../../generate/generate_random_reddit_community_member_posts_votes_create";
import { generate_random_reddit_community_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_subscriptions_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_file } from "../../../prepare/prepare_random_reddit_community_post_file";
import { prepare_random_reddit_community_post_vote } from "../../../prepare/prepare_random_reddit_community_post_vote";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

export async function test_api_member_vote_retrieve_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Browse communities to find one to subscribe to
  const browseResult =
    await api.functional.redditCommunity.member.browse_communities.browse(
      memberConnection,
    );
  typia.assert(browseResult);
  TestValidator.equals("communities exist", browseResult.data.length > 0, true);
  const community = browseResult.data[0];
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await generate_random_reddit_community_member_subscriptions_create(
      memberConnection,
      {
        body: {
          reddit_community_communities_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  TestValidator.equals("subscription active", subscription.status, "active");
  TestValidator.equals(
    "subscription member matches",
    subscription.member.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "subscription community matches",
    subscription.community.id,
    community.id,
  );
  // 4. Create a post in the subscribed community
  const post = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        reddit_community_community_id: community.id,
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  TestValidator.equals(
    "post author matches member",
    post.author.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "post community matches",
    post.community.id,
    community.id,
  );
  TestValidator.equals("initial vote score", post.vote_score, 0);
  // 5. Cast an upvote on the post
  const vote = await generate_random_reddit_community_member_posts_votes_create(
    memberConnection,
    {
      body: {
        vote_type: "upvote",
      },
      params: {
        postId: post.id,
      },
    },
  );
  typia.assert(vote);
  TestValidator.equals("vote type is upvote", vote.vote_type, "upvote");
  TestValidator.equals(
    "vote author matches member",
    vote.author.id,
    memberAuth.id,
  );
  TestValidator.equals("vote post matches", vote.post.id, post.id);
  TestValidator.equals("vote not deleted", vote.deleted_at, null);
  // 6. Retrieve the vote record
  const retrievedVote =
    await api.functional.redditCommunity.member.posts.votes.at(
      memberConnection,
      {
        postId: post.id,
        voteId: vote.id,
      },
    );
  typia.assert(retrievedVote);
  // 7. Validate retrieved vote record
  TestValidator.equals("vote id matches", retrievedVote.id, vote.id);
  TestValidator.equals("vote type matches", retrievedVote.vote_type, "upvote");
  TestValidator.equals(
    "vote author matches member",
    retrievedVote.author.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "vote author username matches",
    retrievedVote.author.username,
    memberAuth.username,
  );
  TestValidator.equals("vote post id matches", retrievedVote.post.id, post.id);
  TestValidator.equals(
    "vote post title matches",
    retrievedVote.post.title,
    post.title,
  );
  TestValidator.equals(
    "vote post type matches",
    retrievedVote.post.post_type,
    typia.assert<"text" | "link" | "image" | null | undefined>(post.post_type),
  );
  TestValidator.equals(
    "vote post vote score matches",
    retrievedVote.post.vote_score,
    post.vote_score,
  );
  TestValidator.equals("deleted_at is null", retrievedVote.deleted_at, null);
  // Validate timestamps are valid ISO 8601
  new Date(retrievedVote.created_at);
  new Date(retrievedVote.updated_at);
  // Validate author timestamps are valid ISO 8601
  new Date(retrievedVote.author.created_at);
  new Date(retrievedVote.author.updated_at);
  // Validate post timestamps are valid ISO 8601
  new Date(retrievedVote.post.created_at);
  new Date(retrievedVote.post.updated_at);
}