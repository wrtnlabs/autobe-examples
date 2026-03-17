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

export async function test_api_comment_vote_update_upvote_to_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Voting member setup
  const votingMemberConnection: api.IConnection = { host: connection.host };
  const votingMemberAuth = await authorize_member_join(votingMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(votingMemberAuth);
  // 2. Comment author member setup (different from voting member)
  const commentAuthorConnection: api.IConnection = { host: connection.host };
  const commentAuthorAuth = await authorize_member_join(
    commentAuthorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        username: RandomGenerator.alphaNumeric(12),
        nickname: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ICommunityPlatformMember.IJoin,
    },
  );
  typia.assert(commentAuthorAuth);
  // 3. Community creation by voting member
  const community =
    await generate_random_community_platform_member_communities_create(
      votingMemberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Subscription to community by voting member
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
  // 5. Post creation by voting member
  const post = await generate_random_community_platform_member_posts_create(
    votingMemberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 7,
        }),
        community_name: community.name,
        content_type: "TEXT",
        content_text: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          formatting: "plain",
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 6. Comment creation by comment author
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      commentAuthorConnection,
      {
        body: {
          content: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies ICommunityPlatformComment.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // 7. Initial upvote by voting member
  const initialUpvote =
    await generate_random_community_platform_member_comments_votes_create(
      votingMemberConnection,
      {
        body: {
          type: "upvote",
        } satisfies ICommunityPlatformCommentVote.ICreate,
        params: {
          commentId: comment.id,
        },
      },
    );
  typia.assert(initialUpvote);
  // 8. Get initial karma score for comment author
  const initialKarma = commentAuthorAuth.karma;
  // 9. Update vote from upvote to downvote
  const updatedVote =
    await api.functional.communityPlatform.member.comments.votes.patchByCommentidAndVoteid(
      votingMemberConnection,
      {
        commentId: comment.id,
        voteId: initialUpvote.id,
        body: {
          type: "downvote",
        } satisfies ICommunityPlatformCommentVote.IUpdate,
      },
    );
  typia.assert(updatedVote);
  // 10. Validate vote update results
  TestValidator.equals(
    "vote type changed to downvote",
    updatedVote.type,
    "downvote",
  );
  TestValidator.notEquals(
    "updated_at changed",
    initialUpvote.updated_at,
    updatedVote.updated_at,
  );
  TestValidator.equals("deleted_at remains null", updatedVote.deleted_at, null);
  TestValidator.equals("vote ID unchanged", updatedVote.id, initialUpvote.id);
  TestValidator.equals(
    "vote comment unchanged",
    updatedVote.comment.id,
    comment.id,
  );
  TestValidator.equals(
    "vote member unchanged",
    updatedVote.member.id,
    votingMemberAuth.id,
  );
  // 11. Check comment vote score decreased by 2 (from +1 to -1)
  // Note: Need to fetch updated comment to get vote score
  // Since we don't have a get comment endpoint, we cannot validate comment.vote_score directly
  // The scenario requires validating comment's vote score, but without GET endpoint we can only trust system
  // Business rule validation would require fetching comment again, which isn't available in API
  // 12. Check comment author karma decreased by 2
  // Note: Need to fetch updated member info to get karma
  // Since we don't have a get member endpoint, we cannot validate karma change directly
  // The scenario requires validating author's karma, but without GET endpoint we can only trust system
  // 13. Business rule validation (section 339): karma decreases by 2 when vote changes from upvote to downvote
  // Without GET endpoints for comment and member, we must trust the system implementation
  // This is a limitation of the current API surface
}
