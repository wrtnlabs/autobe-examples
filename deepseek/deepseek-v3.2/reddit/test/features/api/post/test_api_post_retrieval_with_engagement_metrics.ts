import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_posts_votes_create } from "../../../generate/generate_random_community_platform_member_posts_votes_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

/**
 * Test retrieval of a post with engagement metrics including votes and comments.
 * Create a member account as post author, community, subscription, and text post.
 * Then add engagement by having another member join, subscribe, upvote, and comment.
 * Retrieve the post and verify vote_score is 1 (one upvote), comment_count is 1 (one comment).
 * Test that engagement metrics work for both authenticated members and guests.
 */
export async function test_api_post_retrieval_with_engagement_metrics(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member as post author
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {});
  typia.assert(author);
  // 2. Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      authorConnection,
      {},
    );
  typia.assert(community);
  // 3. First member subscribes to their own community
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      authorConnection,
      {
        body: {
          community_id: community.id,
          active: true,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create text post in the community
  const post = await generate_random_community_platform_member_posts_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: community.name,
        content_type: "TEXT",
        content_text: {
          content: RandomGenerator.content({ paragraphs: 1 }),
          formatting: "plain",
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create second member for engagement
  const engagerConnection: api.IConnection = { host: connection.host };
  const engager = await authorize_member_join(engagerConnection, {});
  typia.assert(engager);
  // 6. Second member subscribes to the same community
  const engagerSubscription =
    await generate_random_community_platform_member_subscriptions_create(
      engagerConnection,
      {
        body: {
          community_id: community.id,
          active: true,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(engagerSubscription);
  // 7. Second member upvotes the post
  const vote =
    await generate_random_community_platform_member_posts_votes_create(
      engagerConnection,
      {
        params: { postId: post.id },
        body: {
          type: "up",
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(vote);
  // 8. Second member adds a comment to the post
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      engagerConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  // 9. Retrieve post as the author (authenticated member) and validate metrics
  const retrievedByAuthor = await api.functional.communityPlatform.posts.at(
    authorConnection,
    { postId: post.id },
  );
  typia.assert(retrievedByAuthor);
  TestValidator.equals(
    "post vote_score should be 1 after one upvote",
    retrievedByAuthor.vote_score,
    1,
  );
  TestValidator.equals(
    "post comment_count should be 1 after one comment",
    retrievedByAuthor.comment_count,
    1,
  );
  TestValidator.equals(
    "post title should remain unchanged",
    retrievedByAuthor.title,
    post.title,
  );
  TestValidator.equals(
    "post author id should match",
    retrievedByAuthor.author.id,
    author.id,
  );
  TestValidator.equals(
    "post community id should match",
    retrievedByAuthor.community.id,
    community.id,
  );
  // 10. Retrieve post as guest (using base connection without auth) and validate metrics
  const retrievedByGuest = await api.functional.communityPlatform.posts.at(
    { host: connection.host }, // guest connection
    { postId: post.id },
  );
  typia.assert(retrievedByGuest);
  TestValidator.equals(
    "guest should see vote_score = 1",
    retrievedByGuest.vote_score,
    1,
  );
  TestValidator.equals(
    "guest should see comment_count = 1",
    retrievedByGuest.comment_count,
    1,
  );
  // 11. Test real-time metric updates: remove the vote (set type to null)
  const removedVote =
    await generate_random_community_platform_member_posts_votes_create(
      engagerConnection,
      {
        params: { postId: post.id },
        body: {
          type: null,
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(removedVote);
  const afterVoteRemoval = await api.functional.communityPlatform.posts.at(
    authorConnection,
    { postId: post.id },
  );
  typia.assert(afterVoteRemoval);
  TestValidator.equals(
    "vote_score should be 0 after vote removal",
    afterVoteRemoval.vote_score,
    0,
  );
  // comment_count remains 1
  TestValidator.equals(
    "comment_count should still be 1 after vote removal",
    afterVoteRemoval.comment_count,
    1,
  );
}
