import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentVote";

/**
 * Test admin retrieval of comment votes with comprehensive filtering and
 * pagination capabilities. Validates administrative oversight functionality for
 * community voting patterns and moderation workflows.
 */
export async function test_api_comment_votes_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Create member account for comment creation and voting
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "password123",
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a comment that will receive votes
  // Since post creation API is not available, we'll use a realistic UUID format
  // that would be valid if a post existed in the system
  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
        community_platform_post_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        status: "published",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(comment);

  // 3. Cast multiple votes on the comment
  const votesToCast = ArrayUtil.repeat(
    5,
    (index) =>
      ({
        vote_type: index % 2 === 0 ? "upvote" : ("downvote" as const),
        actor_type: "member" as const,
        content_type: "comment" as const,
        status: "active" as const,
      }) satisfies ICommunityPlatformVote.ICreate,
  );

  const castVotes: ICommunityPlatformVote[] = [];
  for (const voteData of votesToCast) {
    const vote: ICommunityPlatformVote =
      await api.functional.communityPlatform.member.comments.votes.create(
        connection,
        {
          commentId: comment.id,
          body: voteData,
        },
      );
    typia.assert(vote);
    castVotes.push(vote);
  }

  // 4. Create admin account for vote retrieval
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "adminPassword123",
        display_name: RandomGenerator.name(),
        admin_level: "super",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 5. Admin retrieves votes with pagination and filtering
  const votePage: IPageICommunityPlatformCommentVote.ISummary =
    await api.functional.communityPlatform.admin.comments.votes.index(
      connection,
      {
        commentId: comment.id,
        body: {
          page: 1,
          limit: 10,
          order_by: "created_at",
          order: "desc",
        } satisfies ICommunityPlatformCommentVote.IRequest,
      },
    );
  typia.assert(votePage);

  // 6. Validate vote retrieval results
  TestValidator.equals(
    "pagination should show correct total records",
    votePage.pagination.records,
    castVotes.length,
  );
  TestValidator.equals(
    "page data should contain all cast votes",
    votePage.data.length,
    castVotes.length,
  );
  TestValidator.predicate(
    "vote page should have valid pagination structure",
    votePage.pagination.current === 1 &&
      votePage.pagination.limit === 10 &&
      votePage.pagination.pages >= 1,
  );

  // 7. Validate individual vote properties
  for (const voteSummary of votePage.data) {
    TestValidator.predicate(
      "vote type should be valid",
      voteSummary.vote_type === "upvote" ||
        voteSummary.vote_type === "downvote",
    );
    TestValidator.predicate(
      "vote weight should be positive",
      voteSummary.vote_weight > 0,
    );
    TestValidator.predicate(
      "created_at should be valid date-time",
      new Date(voteSummary.created_at).toString() !== "Invalid Date",
    );
  }

  // 8. Test filtering by vote type
  const upvotePage: IPageICommunityPlatformCommentVote.ISummary =
    await api.functional.communityPlatform.admin.comments.votes.index(
      connection,
      {
        commentId: comment.id,
        body: {
          page: 1,
          limit: 10,
          vote_type: "upvote",
        } satisfies ICommunityPlatformCommentVote.IRequest,
      },
    );
  typia.assert(upvotePage);

  const upvoteCount = castVotes.filter((v) => v.vote_type === "upvote").length;
  TestValidator.equals(
    "upvote filter should return correct count",
    upvotePage.pagination.records,
    upvoteCount,
  );

  // 9. Test that all upvotes in filtered results are actually upvotes
  for (const voteSummary of upvotePage.data) {
    TestValidator.equals(
      "filtered vote should be upvote",
      voteSummary.vote_type,
      "upvote",
    );
  }

  // 10. Test date range filtering with recent timestamp
  const recentVotesPage: IPageICommunityPlatformCommentVote.ISummary =
    await api.functional.communityPlatform.admin.comments.votes.index(
      connection,
      {
        commentId: comment.id,
        body: {
          page: 1,
          limit: 10,
          created_after: new Date(Date.now() - 86400000).toISOString(), // Last 24 hours
        } satisfies ICommunityPlatformCommentVote.IRequest,
      },
    );
  typia.assert(recentVotesPage);

  TestValidator.predicate(
    "date filter should return all votes since they were created recently",
    recentVotesPage.pagination.records === castVotes.length,
  );
}
