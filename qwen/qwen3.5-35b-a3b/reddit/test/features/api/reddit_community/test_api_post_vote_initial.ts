import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_post_vote_initial(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(3),
      href: "http://test.example.com/join",
      referrer: "http://test.example.com",
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Subscribe member to a community
  const subscription =
    await generate_random_reddit_community_member_subscriptions_create(
      memberConnection,
      {
        body: {
          reddit_community_communities_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 3. Create a post in the subscribed community
  const post = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        reddit_community_community_id: subscription.community.id,
        text_content: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // Verify initial vote_score is 0
  TestValidator.equals("initial vote_score", post.vote_score, 0);
  // 4. Cast initial vote (upvote) on the post
  const vote = await generate_random_reddit_community_member_posts_votes_create(
    memberConnection,
    {
      body: {
        vote_type: "upvote",
      } satisfies IRedditCommunityPostVote.ICreate,
      params: {
        postId: post.id,
      },
    },
  );
  typia.assert(vote);
  // 5. Verify vote record has correct post_id
  TestValidator.equals("vote post_id", vote.post.id, post.id);
  // 6. Verify vote has correct vote_type
  TestValidator.equals("vote_type is upvote", vote.vote_type, "upvote");
  // 7. Verify post's vote_score has increased by 1 (from vote response's post reference)
  TestValidator.equals("vote_score increased to 1", vote.post.vote_score, 1);
  // 8. Verify timestamps are set and valid
  const createdAt = new Date(vote.created_at).getTime();
  const updatedAt = new Date(vote.updated_at).getTime();
  TestValidator.predicate("created_at is valid timestamp", createdAt > 0);
  TestValidator.predicate("updated_at is valid timestamp", updatedAt > 0);
  TestValidator.predicate(
    "updated_at is after or equal to created_at",
    updatedAt >= createdAt,
  );
  // 9. Verify author reference contains member's username
  TestValidator.equals(
    "vote author username",
    vote.author.username,
    memberAuth.username,
  );
  // 10. Verify post reference contains correct title and vote_score
  TestValidator.equals("vote post title", vote.post.title, post.title);
  TestValidator.equals("vote post vote_score", vote.post.vote_score, 1);
}
