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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
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
 * Test the admin's ability to retrieve a specific member's upvote on a comment.
 * 1. Admin setup: authenticate admin via admin join and login
 * 2. Create a voter member via member join and login
 * 3. Create a community, subscribe the voter to it
 * 4. Create a post (by comment author) and a comment
 * 5. Have the voter upvote the comment
 * 6. As admin, retrieve the vote and validate it matches
 * 7. Validate karma increase for comment author
 */
export async function test_api_admin_member_comment_vote_retrieve_upvote(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const adminConnection: api.IConnection = { host: connection.host };
  const voterConnection: api.IConnection = { host: connection.host };
  const commentAuthorConnection: api.IConnection = { host: connection.host };
  // 1. Admin setup
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // 2. Create voter member
  const voter = await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(voter);
  // 3. Create comment author member
  const commentAuthor = await authorize_member_join(commentAuthorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password456",
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(commentAuthor);
  // 4. Create community via voter (owner)
  const community =
    await generate_random_community_platform_member_communities_create(
      voterConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 5. Subscribe voter to community
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
  // 6. Create post as comment author (must subscribe first)
  const commentAuthorSubscription =
    await generate_random_community_platform_member_subscriptions_create(
      commentAuthorConnection,
      {
        body: {
          community_id: community.id,
          active: true,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(commentAuthorSubscription);
  const post = await generate_random_community_platform_member_posts_create(
    commentAuthorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
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
  // 7. Create comment on the post as comment author
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      commentAuthorConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformComment.ICreate,
        params: { postId: post.id },
      },
    );
  typia.assert(comment);
  // 8. Get comment author's karma before upvote
  const commentAuthorBeforeKarma = commentAuthor.karma;
  // 9. Voter upvotes the comment
  const vote =
    await generate_random_community_platform_member_comments_votes_create(
      voterConnection,
      {
        body: {
          type: "upvote",
        } satisfies ICommunityPlatformCommentVote.ICreate,
        params: { commentId: comment.id },
      },
    );
  typia.assert(vote);
  // 10. Admin retrieves the vote
  const retrievedVote =
    await api.functional.communityPlatform.admin.members.comments.vote.at(
      adminConnection,
      {
        memberId: voter.id,
        commentId: comment.id,
      },
    );
  typia.assert(retrievedVote);
  // 11. Validate vote details
  TestValidator.equals("vote type is upvote", retrievedVote.type, "upvote");
  TestValidator.equals(
    "member matches voter",
    retrievedVote.member.id,
    voter.id,
  );
  TestValidator.equals("comment matches", retrievedVote.comment.id, comment.id);
  TestValidator.predicate("timestamps present", () => {
    return (
      retrievedVote.created_at !== null && retrievedVote.updated_at !== null
    );
  });
  TestValidator.equals(
    "vote is active (deleted_at null)",
    retrievedVote.deleted_at,
    null,
  );
  // 12. Validate karma increase for comment author (+1 per business rule section 339)
  // Refresh comment author data to get updated karma
  const refreshedCommentAuthor = await authorize_member_login(
    commentAuthorConnection,
    {
      body: {
        email: commentAuthor.email,
        password: "password456",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ICommunityPlatformMember.ILogin,
    },
  );
  typia.assert(refreshedCommentAuthor);
  TestValidator.equals(
    "comment author karma increased by 1",
    refreshedCommentAuthor.karma,
    commentAuthorBeforeKarma + 1,
  );
}
