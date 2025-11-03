import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommentVote";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import type { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";

/**
 * Test that a registered user can retrieve a paginated and filtered list of
 * votes on a comment within a community.
 *
 * This test follows a complete user workflow:
 *
 * 1. Join as a new user.
 * 2. Create a new community.
 * 3. Create a post in the community.
 * 4. Create a comment on the post.
 * 5. Cast multiple votes (upvote/downvote) on the comment by different users.
 * 6. Retrieve the list of votes with filters and pagination applied.
 * 7. Validate that retrieved votes match created votes and pagination works.
 *
 * This comprehensive E2E test verifies registration, authorization, community
 * and content creation, voting functionality, and query filtering logic.
 */
export async function test_api_comment_votes_listing_by_user(
  connection: api.IConnection,
) {
  // 1. User registration and login
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: "StrongP@ssw0rd",
        ip: null,
        href: "https://test.host/registration",
        referrer: "https://test.host",
      } satisfies IRedditCommunityUser.ICreate,
    });
  typia.assert(user);

  // 2. Create a new community
  const communityName: string =
    "test_community_" + RandomGenerator.alphaNumeric(6).toLowerCase();
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: {
        name: communityName,
        description: "Test community for E2E voting scenario",
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);

  // 3. Create a post in the community
  // For content type ID, use a fixed valid UUID pattern (mock)
  // Since actual content type UUID is not specified, generate a random UUID
  const contentTypeId = typia.random<string & tags.Format<"uuid">>();
  const postBody = {
    title: RandomGenerator.name(3),
    body: RandomGenerator.content({ paragraphs: 2 }),
    reddit_community_content_type_id: contentTypeId,
    status: "active",
  } satisfies IRedditCommunityPost.ICreate;

  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.user.communities.posts.create(
      connection,
      {
        communityName: communityName,
        body: postBody,
      },
    );
  typia.assert(post);

  // 4. Create a comment on the post
  const commentBody = {
    body: RandomGenerator.paragraph({ sentences: 5 }),
    parent_id: undefined,
  } satisfies IRedditCommunityComment.ICreate;

  const comment: IRedditCommunityComment =
    await api.functional.redditCommunity.user.communities.posts.comments.create(
      connection,
      {
        communityName: communityName,
        postId: post.id,
        body: commentBody,
      },
    );
  typia.assert(comment);

  // 5. Create multiple votes on the comment by different users
  // Four votes with random vote_type from 'upvote' or 'downvote'
  const voteTypes = ["upvote", "downvote"] as const;

  // We'll create 4 votes. For each vote, simulate a separate user joining,
  // then voting.
  const votes: IRedditCommunityCommentVote[] = [];

  for (let i = 0; i < 4; i++) {
    // Join new user for each vote (simulate distinct user)
    const voteUserEmail =
      `voter${i}_` + typia.random<string & tags.Format<"email">>();

    const voteUser: IRedditCommunityUser.IAuthorized =
      await api.functional.auth.user.join(connection, {
        body: {
          email: voteUserEmail,
          password: "Secur3P@ssw0rd",
          ip: null,
          href: "https://test.host/voter",
          referrer: "https://test.host",
        } satisfies IRedditCommunityUser.ICreate,
      });
    typia.assert(voteUser);

    // Cast vote
    const voteType = RandomGenerator.pick(voteTypes);

    const vote: IRedditCommunityCommentVote =
      await api.functional.redditCommunity.user.communities.comments.votes.create(
        connection,
        {
          communityName: communityName,
          commentId: comment.id,
          body: {
            reddit_community_comment_id: comment.id,
            vote_type: voteType,
          } satisfies IRedditCommunityCommentVote.ICreate,
        },
      );

    typia.assert(vote);
    votes.push(vote);
  }

  // 6. Retrieve the list of votes with filters and pagination
  // Use a search filter matching vote_type of the first vote and pagination limit 2
  const filterVoteType = votes[0].vote_type;
  const requestBody = {
    page: 1,
    limit: 2,
    vote_type: filterVoteType,
    sort_order: "asc",
    search: "",
  } satisfies IRedditCommunityCommentVote.IRequest;

  const paginatedVotes: IPageIRedditCommunityCommentVote.ISummary =
    await api.functional.redditCommunity.user.communities.comments.votes.index(
      connection,
      {
        communityName: communityName,
        commentId: comment.id,
        body: requestBody,
      },
    );

  typia.assert(paginatedVotes);

  // 7. Validate that all retrieved votes match the filter and are valid

  // Check pagination info
  const pagination = paginatedVotes.pagination;
  TestValidator.predicate("page number should be 1", pagination.current === 1);

  TestValidator.predicate("limit per page should be 2", pagination.limit === 2);

  // Check all votes in data have vote_type matching filter
  for (const v of paginatedVotes.data) {
    TestValidator.equals(
      `vote.vote_type should be ${filterVoteType}`,
      v.vote_type,
      filterVoteType,
    );
  }

  // Check that the vote ids returned are subset of all votes that have the filterVoteType
  const allFilteredVotes = votes.filter((v) => v.vote_type === filterVoteType);

  const returnedIds = paginatedVotes.data.map((v) => v.id);
  for (const id of returnedIds) {
    TestValidator.predicate(
      `vote id ${id} is in filtered votes`,
      allFilteredVotes.some((v) => v.id === id),
    );
  }

  // Check that the pagination records count is correct or at least no less than the data length
  TestValidator.predicate(
    "pagination records count should be >= data length",
    pagination.records >= paginatedVotes.data.length,
  );
}
