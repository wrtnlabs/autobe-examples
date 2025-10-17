import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentVote";

/**
 * Verify moderator audit of comment votes with pagination, filtering, and
 * permission enforcement.
 *
 * NOTE: Due to the lack of member registration/login APIs in this scope, all
 * actions (votes, posts, comments) in this test are performed as a single user
 * (the moderator's member context) reusing the same connection/session. This
 * limits true cross-user realism.
 *
 * Steps:
 *
 * 1. Create community as one member (who becomes moderator).
 * 2. Register moderator for the community.
 * 3. Create a post in the community.
 * 4. Add a comment (as the same session user).
 * 5. Cast upvote and downvote sequentially (same user) to test duplicate/vote
 *    switching logic.
 * 6. Audit (retrieve) comment votes as moderator and verify vote value present,
 *    only one per voter persists (i.e., duplicate voting by the same user does
 *    not create extra records).
 * 7. Attempt to audit a comment from a different community and verify forbidden
 *    access.
 * 8. Confirm fields (including voter identity exposure) are present as per
 *    ISummary schema.
 */
export async function test_api_comment_vote_audit_by_moderator(
  connection: api.IConnection,
) {
  // 1. Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          title: RandomGenerator.name(),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        },
      },
    );
  typia.assert(community);

  // 2. Register moderator for the community
  const moderatorEmail = `${RandomGenerator.alphabets(8)}@modtest.com`;
  const moderatorPassword = "Password!123";
  const modAuth = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      community_id: community.id,
    },
  });
  typia.assert(modAuth);

  // 3. Create post
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_type: "text",
        content_body: RandomGenerator.content({ paragraphs: 1 }),
      },
    },
  );
  typia.assert(post);

  // 4. Add a comment
  const comment =
    await api.functional.communityPlatform.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          community_platform_post_id: post.id,
          body: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(comment);

  // 5. Cast upvote and downvote (simulate duplicate voting by same user)
  // Upvote
  await api.functional.communityPlatform.member.comments.votes.create(
    connection,
    {
      commentId: comment.id,
      body: {
        comment_id: comment.id,
        vote_value: 1,
      },
    },
  );
  // Immediately downvote (should update user’s vote rather than create new)
  await api.functional.communityPlatform.member.comments.votes.create(
    connection,
    {
      commentId: comment.id,
      body: {
        comment_id: comment.id,
        vote_value: -1,
      },
    },
  );

  // 6. Audit votes as moderator; only one vote (last value) per voter should exist
  const auditDownvote =
    await api.functional.communityPlatform.moderator.comments.votes.index(
      connection,
      {
        commentId: comment.id,
        body: {
          postId: post.id,
          commentId: comment.id,
          vote_value: -1,
        },
      },
    );
  typia.assert(auditDownvote);
  // Should contain 1 (last) vote for this voter
  TestValidator.equals(
    "exactly one downvote visible after duplicate voting",
    auditDownvote.data.length,
    1,
  );
  TestValidator.equals(
    "moderator sees correct vote_value after duplicate voting",
    auditDownvote.data[0].vote_value,
    -1,
  );
  // Voter/member id should be present, not masked
  TestValidator.predicate(
    "voter identity is present in summary DTO",
    typeof auditDownvote.data[0].community_platform_member_id === "string" &&
      auditDownvote.data[0].community_platform_member_id.length > 0,
  );

  // 7. Attempt to audit comment votes in another community (should be denied)
  const otherCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          title: RandomGenerator.name(),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        },
      },
    );
  typia.assert(otherCommunity);
  const roguePost = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: otherCommunity.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_type: "text",
        content_body: RandomGenerator.content({ paragraphs: 1 }),
      },
    },
  );
  typia.assert(roguePost);
  const rogueComment =
    await api.functional.communityPlatform.member.posts.comments.create(
      connection,
      {
        postId: roguePost.id,
        body: {
          community_platform_post_id: roguePost.id,
          body: RandomGenerator.paragraph({ sentences: 5 }),
        },
      },
    );
  typia.assert(rogueComment);

  await TestValidator.error(
    "moderator cannot audit comments from other communities",
    async () => {
      await api.functional.communityPlatform.moderator.comments.votes.index(
        connection,
        {
          commentId: rogueComment.id,
          body: {
            postId: roguePost.id,
            commentId: rogueComment.id,
            vote_value: 1,
          },
        },
      );
    },
  );
}
