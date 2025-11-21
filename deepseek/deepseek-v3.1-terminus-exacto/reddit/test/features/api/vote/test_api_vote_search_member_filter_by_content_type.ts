import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVote";

/**
 * Test vote search filtering by content type (post/comment) for authenticated
 * members. Validates that the search operation correctly distinguishes between
 * votes cast on posts versus comments and returns appropriate results based on
 * content type.
 */
export async function test_api_vote_search_member_filter_by_content_type(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "password123";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create test posts for voting
  const post1 = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post1);

  const post2 = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post2);

  // Step 3: Create test comments for voting
  const comment1 =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        body: RandomGenerator.content({ paragraphs: 1 }),
        community_platform_post_id: post1.id,
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(comment1);

  const comment2 =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        body: RandomGenerator.content({ paragraphs: 1 }),
        community_platform_post_id: post2.id,
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(comment2);

  // Step 4: Cast votes on posts
  const postVote1 =
    await api.functional.communityPlatform.member.posts.votes.create(
      connection,
      {
        postId: post1.id,
        body: {
          vote_type: "upvote",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(postVote1);

  const postVote2 =
    await api.functional.communityPlatform.member.posts.votes.create(
      connection,
      {
        postId: post2.id,
        body: {
          vote_type: "downvote",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(postVote2);

  // Step 5: Cast votes on comments
  const commentVote1 =
    await api.functional.communityPlatform.member.comments.votes.create(
      connection,
      {
        commentId: comment1.id,
        body: {
          vote_type: "upvote",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(commentVote1);

  const commentVote2 =
    await api.functional.communityPlatform.member.comments.votes.create(
      connection,
      {
        commentId: comment2.id,
        body: {
          vote_type: "downvote",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(commentVote2);

  // Step 6: Search votes filtered by 'post' content type
  const postVotesResult =
    await api.functional.communityPlatform.member.votes.index(connection, {
      body: {
        content_type: "post",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(postVotesResult);

  // Validate post votes search results
  TestValidator.equals(
    "post votes search should return post votes only",
    postVotesResult.data.every((vote) => vote.content_type === "post"),
    true,
  );

  // Step 7: Search votes filtered by 'comment' content type
  const commentVotesResult =
    await api.functional.communityPlatform.member.votes.index(connection, {
      body: {
        content_type: "comment",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(commentVotesResult);

  // Validate comment votes search results
  TestValidator.equals(
    "comment votes search should return comment votes only",
    commentVotesResult.data.every((vote) => vote.content_type === "comment"),
    true,
  );

  // Step 8: Search votes without content type filter (mixed results)
  const mixedVotesResult =
    await api.functional.communityPlatform.member.votes.index(connection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(mixedVotesResult);

  // Validate mixed votes search contains both content types
  const hasPostVotes = mixedVotesResult.data.some(
    (vote) => vote.content_type === "post",
  );
  const hasCommentVotes = mixedVotesResult.data.some(
    (vote) => vote.content_type === "comment",
  );

  TestValidator.predicate(
    "mixed votes search should contain post votes",
    hasPostVotes,
  );

  TestValidator.predicate(
    "mixed votes search should contain comment votes",
    hasCommentVotes,
  );

  // Step 9: Validate vote details in search results
  const foundPostVote = mixedVotesResult.data.find(
    (vote) => vote.id === postVote1.id,
  );
  if (foundPostVote) {
    TestValidator.equals(
      "found post vote should have post content type",
      foundPostVote.content_type,
      "post",
    );
    TestValidator.equals(
      "found post vote should have correct vote type",
      foundPostVote.vote_type,
      "upvote",
    );
  }

  const foundCommentVote = mixedVotesResult.data.find(
    (vote) => vote.id === commentVote1.id,
  );
  if (foundCommentVote) {
    TestValidator.equals(
      "found comment vote should have comment content type",
      foundCommentVote.content_type,
      "comment",
    );
    TestValidator.equals(
      "found comment vote should have correct vote type",
      foundCommentVote.vote_type,
      "upvote",
    );
  }
}
