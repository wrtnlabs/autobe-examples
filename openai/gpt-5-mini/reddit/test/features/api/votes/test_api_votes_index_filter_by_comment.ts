import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalComment";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalPost";
import type { ICommunityPortalVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPortalVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPortalVote";

/**
 * Validate votes index filtering by commentId.
 *
 * Business context: This test verifies that the votes listing endpoint
 * correctly filters votes by comment id. It covers the end-to-end flow to
 * create the necessary data (member registration, community, post, comment),
 * casts votes on the comment from multiple members, queries the votes index
 * with the commentId filter, and asserts that only votes for that comment are
 * returned and that vote values are valid (+1 or -1). It also asserts that
 * providing both postId and commentId simultaneously is rejected (XOR
 * constraint) by the API.
 *
 * Steps:
 *
 * 1. Register an author member.
 * 2. Create a community as author.
 * 3. Create a text post in the community as author.
 * 4. Create a top-level comment on the post as author.
 * 5. Register two additional members and cast votes on the comment as each.
 * 6. Call PATCH /communityPortal/member/votes with commentId filter and validate
 *    returned items and pagination.
 * 7. Verify that supplying both postId and commentId in the same request causes an
 *    error (XOR enforcement).
 */
export async function test_api_votes_index_filter_by_comment(
  connection: api.IConnection,
) {
  // 1. Register the author member
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const author = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: authorEmail,
      password: "P@ssw0rd!",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPortalMember.ICreate,
  });
  typia.assert(author);

  // 2. Create a community as the author
  const community =
    await api.functional.communityPortal.member.communities.create(connection, {
      body: {
        name: RandomGenerator.name(2),
        slug: `${RandomGenerator.alphaNumeric(6)}`,
        description: null,
        is_private: false,
        visibility: "public",
      } satisfies ICommunityPortalCommunity.ICreate,
    });
  typia.assert(community);

  // 3. Create a text post in the community
  const post = await api.functional.communityPortal.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 8,
        }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPortalPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Create a top-level comment under the post
  const comment =
    await api.functional.communityPortal.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          parent_comment_id: null,
          body: RandomGenerator.paragraph({ sentences: 6 }),
        } satisfies ICommunityPortalComment.ICreate,
      },
    );
  typia.assert(comment);

  // 5. Register two voters and cast votes on the comment
  // Voter A: upvote (+1)
  const voterAEmail = typia.random<string & tags.Format<"email">>();
  const voterA = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: voterAEmail,
      password: "P@ssw0rd!",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPortalMember.ICreate,
  });
  typia.assert(voterA);

  const voteA =
    await api.functional.communityPortal.member.posts.comments.votes.create(
      connection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          value: 1,
        } satisfies ICommunityPortalVote.ICreate,
      },
    );
  typia.assert(voteA);

  // Voter B: downvote (-1)
  const voterBEmail = typia.random<string & tags.Format<"email">>();
  const voterB = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: voterBEmail,
      password: "P@ssw0rd!",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPortalMember.ICreate,
  });
  typia.assert(voterB);

  const voteB =
    await api.functional.communityPortal.member.posts.comments.votes.create(
      connection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          value: -1,
        } satisfies ICommunityPortalVote.ICreate,
      },
    );
  typia.assert(voteB);

  // 6. Call votes.index with commentId filter
  const page = await api.functional.communityPortal.member.votes.index(
    connection,
    {
      body: {
        commentId: comment.id,
        limit: 20,
        offset: 0,
      } satisfies ICommunityPortalVote.IRequest,
    },
  );
  typia.assert(page);

  // Validate: all returned items reference the requested commentId
  TestValidator.predicate(
    "all returned votes target the requested comment",
    page.data.every((v) => v.comment_id === comment.id),
  );

  // Validate: values are +1 or -1
  TestValidator.predicate(
    "all vote values are either +1 or -1",
    page.data.every((v) => v.value === 1 || v.value === -1),
  );

  // Validate: pagination meta exists and looks consistent
  TestValidator.predicate(
    "pagination meta present",
    page.pagination !== null && page.pagination !== undefined,
  );

  // 7. Verify XOR constraint: providing both postId and commentId should fail
  await TestValidator.error(
    "providing both postId and commentId must be rejected",
    async () => {
      await api.functional.communityPortal.member.votes.index(connection, {
        body: {
          postId: post.id,
          commentId: comment.id,
          limit: 10,
          offset: 0,
        } satisfies ICommunityPortalVote.IRequest,
      });
    },
  );
}
