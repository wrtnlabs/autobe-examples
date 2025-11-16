import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVote";

/**
 * Test moderator retrieval of paginated voting records.
 *
 * This test validates that moderators can successfully retrieve paginated
 * voting records from the community platform. It verifies the pagination
 * mechanism works correctly with proper page navigation, limit settings, and
 * metadata tracking.
 *
 * The test workflow:
 *
 * 1. Register a new moderator account via the join endpoint
 * 2. Retrieve paginated voting records on the first page
 * 3. Validate pagination metadata (current page, total records, total pages,
 *    limit)
 * 4. Verify response structure matches expected IPageICommunityPlatformVote format
 * 5. Confirm data array contains vote records with proper structure
 */
export async function test_api_voting_records_moderator_retrieval_by_page(
  connection: api.IConnection,
) {
  // 1. Create moderator account for authenticated access
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(15),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Retrieve paginated voting records with default pagination settings
  const votingRecordsPage: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.moderator.votes.index(connection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(votingRecordsPage);

  // 3. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination object exists",
    votingRecordsPage.pagination !== null &&
      votingRecordsPage.pagination !== undefined,
  );

  TestValidator.predicate(
    "current page equals 1",
    votingRecordsPage.pagination.current === 1,
  );

  TestValidator.predicate(
    "limit equals 20",
    votingRecordsPage.pagination.limit === 20,
  );

  TestValidator.predicate(
    "total records is non-negative",
    votingRecordsPage.pagination.records >= 0,
  );

  TestValidator.predicate(
    "total pages is non-negative",
    votingRecordsPage.pagination.pages >= 0,
  );

  // 4. Validate that pages calculation matches records and limit
  const expectedPages = Math.ceil(
    votingRecordsPage.pagination.records / votingRecordsPage.pagination.limit,
  );
  TestValidator.equals(
    "calculated pages match returned pages",
    expectedPages,
    votingRecordsPage.pagination.pages,
  );

  // 5. Verify data array exists and contains proper vote records
  TestValidator.predicate(
    "data array exists",
    Array.isArray(votingRecordsPage.data),
  );

  TestValidator.predicate(
    "data array length does not exceed limit",
    votingRecordsPage.data.length <= votingRecordsPage.pagination.limit,
  );

  // 6. Validate each vote record structure if data exists
  if (votingRecordsPage.data.length > 0) {
    const firstVote = votingRecordsPage.data[0];
    typia.assert(firstVote);

    TestValidator.predicate(
      "vote has valid id",
      typeof firstVote.id === "string" && firstVote.id.length > 0,
    );

    TestValidator.predicate(
      "vote has member_id",
      typeof firstVote.community_platform_member_id === "string",
    );

    TestValidator.predicate(
      "vote has member summary",
      firstVote.member !== null && firstVote.member !== undefined,
    );

    TestValidator.predicate(
      "vote has valid content_type",
      firstVote.content_type === "post" || firstVote.content_type === "comment",
    );

    TestValidator.predicate(
      "vote has content_id",
      typeof firstVote.content_id === "string",
    );

    TestValidator.predicate(
      "vote has valid vote_type",
      firstVote.vote_type === "upvote" || firstVote.vote_type === "downvote",
    );

    TestValidator.predicate(
      "vote has created_at timestamp",
      typeof firstVote.created_at === "string",
    );
  }
}
