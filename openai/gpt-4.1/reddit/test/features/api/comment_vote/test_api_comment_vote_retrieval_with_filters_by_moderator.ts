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
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentVote";

/**
 * Tests moderator comment vote retrieval with advanced filters, including user,
 * comment ID, vote_type, status, and date ranges.
 *
 * Workflow:
 *
 * 1. Register and login as user (who will create content for voting)
 * 2. Register and login as moderator
 * 3. User creates a community
 * 4. User creates a post in the community
 * 5. User creates a comment in the post (to make comment eligible to receive
 *    votes)
 * 6. As moderator, retrieve comment votes with various filter scenarios
 *
 * Verifies authentication, correct behavior of moderation API, paginated,
 * filtered retrieval, and correct response structure.
 */
export async function test_api_comment_vote_retrieval_with_filters_by_moderator(
  connection: api.IConnection,
) {
  // 1. Register & login as user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "pwd" + RandomGenerator.alphaNumeric(8);

  const userAuthorized = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword as string & tags.Format<"password">,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userAuthorized);

  // 2. Register & login as moderator
  const modEmail = typia.random<string & tags.Format<"email">>();
  const modPassword = "pM" + RandomGenerator.alphaNumeric(10);
  const modJoin = await api.functional.auth.moderator.join(connection, {
    body: {
      email: modEmail,
      password: modPassword,
      status: "active",
      href: "https://moderatorpanel.local/registration",
      referrer: "https://ref.local/",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(modJoin);

  // -- moderator login (to test login credential)
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: modEmail,
      password: modPassword as string & tags.Format<"password">,
      href: "https://moderatorpanel.local/login",
      referrer: "https://ref.local/",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // 3. User login again for content creation
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword as string & tags.Format<"password">,
      href: "https://user.local/login",
      referrer: "https://user.local/",
    } satisfies ICommunityPlatformUser.ILogin,
  });

  // 4. User creates community
  const communityName = RandomGenerator.alphaNumeric(10).toLowerCase();
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: communityName as string & tags.MinLength<3> & tags.MaxLength<30>,
        display_title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 8 }),
        visibility: "public",
        status: "active",
      } satisfies ICommunityPlatformCommunity.ICreate,
    });
  typia.assert(community);

  // 5. User creates a post in the community
  const post = await api.functional.communityPlatform.user.posts.create(
    connection,
    {
      body: {
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        status: "published",
        community_id: community.id,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 6. User creates a comment in the post
  const comment = await api.functional.communityPlatform.user.comments.create(
    connection,
    {
      body: {
        post_id: post.id,
        body: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);

  // Switch to moderator account
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: modEmail,
      password: modPassword as string & tags.Format<"password">,
      href: "https://moderatorpanel.local/login",
      referrer: "https://ref.local/",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // === Now, try to retrieve comment votes (should be empty, since no votes yet) ===
  const emptyVoteResult =
    await api.functional.communityPlatform.moderator.commentVotes.index(
      connection,
      {
        body: {
          comment_id: comment.id,
          vote_type: "up",
          page: 1,
          limit: 10,
          active_only: true,
        } satisfies ICommunityPlatformCommentVote.IRequest,
      },
    );
  typia.assert(emptyVoteResult);
  TestValidator.equals(
    "no comment votes yet for comment",
    emptyVoteResult.data.length,
    0,
  );

  // === Now, simulate a scenario with no matching votes using user_id filter (random uuid) ===
  const voteByRandomUserResult =
    await api.functional.communityPlatform.moderator.commentVotes.index(
      connection,
      {
        body: {
          user_id: typia.random<string & tags.Format<"uuid">>(),
          vote_type: "up",
          page: 1,
          limit: 10,
          active_only: true,
        } satisfies ICommunityPlatformCommentVote.IRequest,
      },
    );
  typia.assert(voteByRandomUserResult);
  TestValidator.equals(
    "no votes from random user_uuid",
    voteByRandomUserResult.data.length,
    0,
  );

  // === Query with open filter (should also return no votes, as none are cast) ===
  const allVoteResultNoVotes =
    await api.functional.communityPlatform.moderator.commentVotes.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          active_only: true,
        } satisfies ICommunityPlatformCommentVote.IRequest,
      },
    );
  typia.assert(allVoteResultNoVotes);
  TestValidator.equals(
    "still no comment votes exist",
    allVoteResultNoVotes.data.length,
    0,
  );

  // === (Optional: cover date range filters, edge case: provide current date range, expect no match) ===
  const now = new Date().toISOString();
  const voteByDateRange =
    await api.functional.communityPlatform.moderator.commentVotes.index(
      connection,
      {
        body: {
          created_after: now,
          created_before: now,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommentVote.IRequest,
      },
    );
  typia.assert(voteByDateRange);
  TestValidator.equals(
    "no votes in extremely narrow date range",
    voteByDateRange.data.length,
    0,
  );
}
