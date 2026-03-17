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

export async function test_api_comment_vote_update_downvote_to_upvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create voter member and authenticate
  const voterConnection: api.IConnection = { host: connection.host };
  const voterAuthorized = await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphaNumeric(10),
      nickname: RandomGenerator.name(1),
      href: "https://example.com",
      referrer: "https://example.com/referrer",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(voterAuthorized);
  // 2. Create comment author member and authenticate
  const authorConnection: api.IConnection = { host: connection.host };
  const authorAuthorized = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphaNumeric(10),
      nickname: RandomGenerator.name(1),
      href: "https://example.com",
      referrer: "https://example.com/referrer",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(authorAuthorized);
  const initialAuthorKarma = authorAuthorized.karma;
  // 3. Voter creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      voterConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 4. Voter subscribes to the community (required for creating posts)
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      voterConnection,
      {
        body: {
          community_id: community.id,
          active: true,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 5. Voter creates a text post in the community
  const post = await generate_random_community_platform_member_posts_create(
    voterConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
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
  // 6. Comment author writes a comment on the post
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      authorConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  const initialCommentScore = comment.vote_score;
  // 7. Voter casts initial downvote on the comment
  const downvote =
    await generate_random_community_platform_member_comments_votes_create(
      voterConnection,
      {
        params: { commentId: comment.id },
        body: {
          type: "downvote",
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert(downvote);
  TestValidator.equals("initial downvote type", downvote.type, "downvote");
  // 8. Since there's no GET comment endpoint in provided SDK,
  // we verify the vote update logic and karma changes directly
  // 9. Voter updates vote to upvote via PATCH
  // Check if utility function exists for PATCH - none exists, use SDK directly
  const updatedVote =
    await api.functional.communityPlatform.member.comments.votes.patchByCommentidAndVoteid(
      voterConnection,
      {
        commentId: comment.id,
        voteId: downvote.id,
        body: {
          type: "upvote",
        } satisfies ICommunityPlatformCommentVote.IUpdate,
      },
    );
  typia.assert(updatedVote);
  // 10. Validate updated vote has type: 'upvote', updated_at changed, deleted_at null
  TestValidator.equals("updated vote type", updatedVote.type, "upvote");
  TestValidator.notEquals(
    "updated_at changed",
    downvote.updated_at,
    updatedVote.updated_at,
  );
  TestValidator.equals("deleted_at null", updatedVote.deleted_at, null);
  // 11. Business rule validation:
  // - Comment vote_score should increase by 2 (from -1 to +1)
  // - Comment author's karma should increase by 2 (downvote -1 → upvote +1 = net +2)
  // Since we cannot fetch the comment again, we test the business logic through
  // the vote update response and assume backend handles score updates correctly
  // Validate that vote type changed correctly
  TestValidator.notEquals("vote type changed", downvote.type, updatedVote.type);
  // 12. To verify karma change, we would need a way to get updated member info
  // Without a GET member endpoint, we cannot verify karma change in this test
  // This is a limitation of the available API endpoints
  // At minimum, verify the vote update was successful
  TestValidator.predicate(
    "vote successfully updated from downvote to upvote",
    downvote.type === "downvote" && updatedVote.type === "upvote",
  );
}
