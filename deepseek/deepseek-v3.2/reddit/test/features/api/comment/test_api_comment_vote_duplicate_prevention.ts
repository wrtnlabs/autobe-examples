import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
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
import { generate_random_community_platform_member_comments_votes_create } from "../../../generate/generate_random_community_platform_member_comments_votes_create";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_vote } from "../../../prepare/prepare_random_community_platform_comment_vote";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

/**
 * Test scenario: Member attempts duplicate vote and system prevents it.
 *
 * Setup:
 * 1. Create first member account via join (voter)
 * 2. Create second member account via join (comment author)
 * 3. First member creates a community
 * 4. First member subscribes to the community (required for posting)
 * 5. First member creates a TEXT post in the community
 * 6. Second member creates a comment on the post (as comment author)
 *
 * Test execution:
 * 1. First member upvotes the comment with vote type 'upvote' (success)
 * 2. Verify vote creation success
 * 3. First member attempts to vote again on same comment with either 'upvote' or 'downvote'
 * 4. Verify second vote attempt fails with appropriate error (duplicate vote prevention)
 * 5. Since retrieval APIs (member.at, comments.at) don't exist, we cannot verify
 *    karma or vote score changes directly, but the duplicate prevention is still tested.
 */
export async function test_api_comment_vote_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create voting member connection
  const votingMemberConnection: api.IConnection = { host: connection.host };
  const votingMember = await authorize_member_join(votingMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphabets(8),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(votingMember);
  // 2. Create comment author member connection
  const commentAuthorConnection: api.IConnection = { host: connection.host };
  const commentAuthor = await authorize_member_join(commentAuthorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphabets(8),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(commentAuthor);
  // 3. Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      votingMemberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(12),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Subscribe to community (required for posting)
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      votingMemberConnection,
      {
        body: {
          community_id: community.id,
          active: true,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 5. Create text post in community
  const post = await generate_random_community_platform_member_posts_create(
    votingMemberConnection,
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
  // 6. Create comment on post by comment author
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      commentAuthorConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  // 7. First vote (upvote) - should succeed
  const vote =
    await generate_random_community_platform_member_comments_votes_create(
      votingMemberConnection,
      {
        params: { commentId: comment.id },
        body: {
          type: "upvote",
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert(vote);
  TestValidator.equals("first vote type should be upvote", vote.type, "upvote");
  // 8. Attempt duplicate vote - should fail with error
  await TestValidator.error("duplicate vote should fail", async () => {
    await generate_random_community_platform_member_comments_votes_create(
      votingMemberConnection,
      {
        params: { commentId: comment.id },
        body: {
          type: "downvote",
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  });
  // Note: We cannot verify karma changes or vote score changes
  // because the retrieval APIs (member.at, comments.at) don't exist.
  // The test still validates the core duplicate prevention logic.
}
