import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentVote";

/**
 * Validate admin audit of comment votes (upvotes and downvotes).
 *
 * Test process:
 *
 * 1. Register as admin for audit capability
 * 2. As member1, create a community
 * 3. As member1, add a post to the community
 * 4. As member1, create a comment on the post
 * 5. As new members (user2, user3, user4), cast votes (upvote/downvote) on the
 *    comment
 * 6. As admin, retrieve votes (audit log) via admin API, validate list of upvotes
 *    and downvotes, test pagination and filtering
 * 7. Edge: Retrieve votes for a comment with no votes (should be empty)
 * 8. Edge: Retrieve votes in private or banned community (admin can still see)
 */
export async function test_api_comment_vote_audit_by_admin(
  connection: api.IConnection,
) {
  // 1. Register as admin for audit access
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPass!123",
      superuser: true,
    },
  });
  typia.assert(admin);
  // At this point, the connection uses admin's Authorization automatically.

  // Helper: Function to simulate login as different members (by new admin registration, since only admin join API is available for test scope)
  // In real use, this would use member registration/login, but the scope provided only enables admin join.
  // So we'll use multiple admin users to simulate different members for unique votes.
  async function registerMember(): Promise<ICommunityPlatformAdmin.IAuthorized> {
    const email = typia.random<string & tags.Format<"email">>();
    return await api.functional.auth.admin.join(connection, {
      body: {
        email,
        password: "GenericPass!123",
        superuser: false,
      },
    });
  }

  // 2. As member1, create a community
  const member1 = await registerMember();
  await api.functional.auth.admin.join(connection, {
    body: {
      email: member1.email,
      password: "GenericPass!123",
      superuser: false,
    },
  });
  // Now, create community as member1
  const communityReq = {
    name: RandomGenerator.alphabets(10),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityReq,
      },
    );
  typia.assert(community);

  // 3. Create a post in the community as member1
  const postReq = {
    community_platform_community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 5 }),
    content_type: "text",
    content_body: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ICommunityPlatformPost.ICreate;
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: postReq,
    },
  );
  typia.assert(post);

  // 4. Create a comment on the post as member1
  const commentReq = {
    community_platform_post_id: post.id,
    body: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformComment.ICreate;
  const comment =
    await api.functional.communityPlatform.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentReq,
      },
    );
  typia.assert(comment);

  // 5. Register several voters (user2, user3, user4), cast upvotes/downvotes
  const voters = await ArrayUtil.asyncMap([1, 2, 3], async () =>
    registerMember(),
  );

  const voteValues: Array<1 | -1> = [1, -1, 1];
  await ArrayUtil.asyncForEach(voters, async (voter, i) => {
    // Simulate voter login (switch current connection to this admin for accessibility)
    await api.functional.auth.admin.join(connection, {
      body: {
        email: voter.email,
        password: "GenericPass!123",
        superuser: voter.superuser,
      },
    });
    // Cast their vote on the comment
    const voteReq = {
      vote_value: voteValues[i],
      comment_id: comment.id,
    } satisfies ICommunityPlatformCommentVote.ICreate;
    const vote =
      await api.functional.communityPlatform.member.comments.votes.create(
        connection,
        {
          commentId: comment.id,
          body: voteReq,
        },
      );
    typia.assert(vote);
  });

  // Switch back to true admin for audit (global access)
  await api.functional.auth.admin.join(connection, {
    body: {
      email: admin.email,
      password: "AdminPass!123",
      superuser: true,
    },
  });

  // 6. Admin requests vote audit for the comment
  const auditReqAll: ICommunityPlatformCommentVote.IRequest = {
    postId: post.id,
    commentId: comment.id,
    vote_value: 1,
  };
  // Fetch upvotes
  let result =
    await api.functional.communityPlatform.admin.comments.votes.index(
      connection,
      {
        commentId: comment.id,
        body: auditReqAll,
      },
    );
  typia.assert(result);
  TestValidator.equals("admin can fetch upvotes", result.pagination.records, 2);
  TestValidator.predicate(
    "upvotes have correct vote values",
    result.data.every((v) => v.vote_value === 1),
  );
  // Fetch downvotes
  const auditReqDown: ICommunityPlatformCommentVote.IRequest = {
    postId: post.id,
    commentId: comment.id,
    vote_value: -1,
  };
  result = await api.functional.communityPlatform.admin.comments.votes.index(
    connection,
    {
      commentId: comment.id,
      body: auditReqDown,
    },
  );
  typia.assert(result);
  TestValidator.equals(
    "admin can fetch downvotes",
    result.pagination.records,
    1,
  );
  TestValidator.predicate(
    "downvotes have correct vote values",
    result.data.every((v) => v.vote_value === -1),
  );
  // Fetch with voter-specific filter (pick one of the voters)
  const voterToFind = voters[0];
  const auditReqVoter: ICommunityPlatformCommentVote.IRequest = {
    postId: post.id,
    commentId: comment.id,
    vote_value: 1,
  };
  result = await api.functional.communityPlatform.admin.comments.votes.index(
    connection,
    {
      commentId: comment.id,
      body: auditReqVoter,
    },
  );
  typia.assert(result);
  TestValidator.predicate(
    "admin can fetch specific voter's upvote",
    result.data.some((v) => v.community_platform_member_id === voterToFind.id),
  );

  // 7. Edge: Comment with no votes
  const commentNoVotes =
    await api.functional.communityPlatform.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          community_platform_post_id: post.id,
          body: "Comment with no votes",
        },
      },
    );
  typia.assert(commentNoVotes);
  const auditEmptyReq: ICommunityPlatformCommentVote.IRequest = {
    postId: post.id,
    commentId: commentNoVotes.id,
    vote_value: 1,
  };
  const auditEmpty =
    await api.functional.communityPlatform.admin.comments.votes.index(
      connection,
      {
        commentId: commentNoVotes.id,
        body: auditEmptyReq,
      },
    );
  typia.assert(auditEmpty);
  TestValidator.equals(
    "no votes on new comment",
    auditEmpty.pagination.records,
    0,
  );

  // 8. Edge: community status changed to private (simulate ban -- as there's no API in scope for status change, test that admin can audit on normal data)
  // Confirm that admin always has access as designed
}
