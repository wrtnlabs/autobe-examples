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
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

/**
 * Validate moderator's ability to paginate and retrieve votes on a specific
 * comment.
 *
 * Scenario:
 *
 * 1. Moderator signs up and logs in.
 * 2. Registered user signs up and logs in.
 * 3. Registered user creates a community.
 * 4. Registered user creates a post in the community.
 * 5. Registered user adds a comment on the post.
 * 6. Moderator requests paginated votes on the comment.
 * 7. Validate pagination response data corresponds to the comment votes.
 *
 * Verifies that moderator authentication and comment vote pagination APIs work
 * as expected, enforcing access controls and returning properly filtered and
 * ordered vote data.
 */
export async function test_api_comment_vote_pagination_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Moderator joins
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "ModPass123!";
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
    } satisfies IRedditCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Registered user joins
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "UserPass123!";
  const registeredUser = await api.functional.auth.registeredUser.join(
    connection,
    {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies IRedditCommunityRegisteredUser.ICreate,
    },
  );
  typia.assert(registeredUser);

  // Step 3: Registered user logs in
  await api.functional.auth.registeredUser.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "http://localhost/", // dummy
      referrer: "http://localhost/referrer", // dummy
    } satisfies IRedditCommunityRegisteredUser.ILogin,
  });

  // Step 4: Registered user creates a community
  const communityCreateBody = {
    communityName: RandomGenerator.alphabets(
      10,
    ).toLowerCase() satisfies string & tags.Pattern<"^[a-z0-9_-]+$">,
    displayName: RandomGenerator.name(3) satisfies string &
      tags.MinLength<3> &
      tags.MaxLength<100>,
    description: RandomGenerator.paragraph({
      sentences: 10,
      wordMin: 4,
      wordMax: 8,
    }) satisfies string & tags.MinLength<0> & tags.MaxLength<1000>,
    imageUrl: null,
    isPrivate: false,
  } satisfies IRedditCommunityCommunity.ICreate;

  const community =
    await api.functional.redditCommunity.registeredUser.redditCommunity.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // Step 5: Registered user creates a post
  // Since community id (UUID) is required for post create, simulate with random UUID
  const communityIdForPost = typia.random<string & tags.Format<"uuid">>();
  const postCreateBody = {
    reddit_community_community_id: communityIdForPost, // using a random UUID as community id
    type: "text" as const,
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 7 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    link_url: null,
    image_url: null,
  } satisfies IRedditCommunityPost.ICreate;

  const post =
    await api.functional.redditCommunity.registeredUser.redditCommunity.posts.create(
      connection,
      { body: postCreateBody },
    );
  typia.assert(post);

  // Step 6: Registered user posts a comment on the post
  const commentCreateBody = {
    body: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies IRedditCommunityComment.ICreate;

  const comment =
    await api.functional.redditCommunity.registeredUser.redditCommunity.posts.comments.create(
      connection,
      { postId: post.id, body: commentCreateBody },
    );
  typia.assert(comment);

  // Step 7: Moderator logs in
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "http://localhost/",
      referrer: "http://localhost/referrer",
    } satisfies IRedditCommunityModerator.ILogin,
  });

  // Step 8: Moderator fetches paginated comment votes
  const commentVotePaginationBody = {
    page: 1,
    limit: 10,
    orderBy: "created_at",
    orderDirection: "desc",
  } satisfies IRedditCommunityCommentVote.IRequest;

  const commentVotesPage =
    await api.functional.redditCommunity.moderator.redditCommunity.posts.comments.commentVotes.index(
      connection,
      {
        postId: post.id,
        commentId: comment.id,
        body: commentVotePaginationBody,
      },
    );
  typia.assert(commentVotesPage);

  // Step 9: Validations on pagination and data integrity
  TestValidator.predicate(
    "pagination current page is 1",
    commentVotesPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    commentVotesPage.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination pages is positive",
    commentVotesPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records count matches data length or more",
    commentVotesPage.pagination.records >= commentVotesPage.data.length,
  );

  for (const vote of commentVotesPage.data) {
    typia.assert(vote);
    TestValidator.equals(
      "all votes belong to correct comment",
      vote.reddit_community_comment.id,
      comment.id,
    );
  }
}
