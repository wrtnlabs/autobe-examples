import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVote";

export async function test_api_voting_records_moderator_empty_results(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorCreate = {
    email: moderatorEmail,
    username: RandomGenerator.alphabets(15),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformModerator.ICreate;

  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreate,
    });
  typia.assert(moderator);

  // Step 2: Query votes with filter that returns no results - non-existent member_id
  const nonExistentMemberId = typia.random<string & tags.Format<"uuid">>();
  const emptyResultsByMember: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.moderator.votes.index(connection, {
      body: {
        member_id: nonExistentMemberId,
        page: 1,
        limit: 20,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(emptyResultsByMember);

  // Validate empty result set structure
  TestValidator.equals(
    "empty results by member - data array is empty",
    emptyResultsByMember.data.length,
    0,
  );
  TestValidator.equals(
    "empty results by member - pagination records is zero",
    emptyResultsByMember.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty results by member - pagination pages is zero",
    emptyResultsByMember.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "empty results by member - pagination current is valid",
    emptyResultsByMember.pagination.current >= 0,
  );
  TestValidator.predicate(
    "empty results by member - pagination limit is valid",
    emptyResultsByMember.pagination.limit > 0,
  );

  // Step 3: Query votes with future date range filter that returns no results
  const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const emptyResultsByDate: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.moderator.votes.index(connection, {
      body: {
        created_after: futureDate.toISOString(),
        created_before: new Date(
          Date.now() + 60 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        page: 1,
        limit: 50,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(emptyResultsByDate);

  // Validate empty result set structure for date range filter
  TestValidator.equals(
    "empty results by date - data array is empty",
    emptyResultsByDate.data.length,
    0,
  );
  TestValidator.equals(
    "empty results by date - pagination records is zero",
    emptyResultsByDate.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty results by date - pagination pages is zero",
    emptyResultsByDate.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "empty results by date - pagination current is valid",
    emptyResultsByDate.pagination.current >= 0,
  );

  // Step 4: Query with multiple filters that return no results
  const emptyResultsMultiFilter: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.moderator.votes.index(connection, {
      body: {
        member_id: nonExistentMemberId,
        content_type: "post",
        vote_type: "upvote",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(emptyResultsMultiFilter);

  // Validate empty result set with multiple filters
  TestValidator.equals(
    "empty results multi-filter - data array is empty",
    emptyResultsMultiFilter.data.length,
    0,
  );
  TestValidator.equals(
    "empty results multi-filter - pagination records is zero",
    emptyResultsMultiFilter.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty results multi-filter - pagination pages is zero",
    emptyResultsMultiFilter.pagination.pages,
    0,
  );

  // Step 5: Verify response structure is intact even with empty results
  TestValidator.predicate(
    "response has pagination field",
    emptyResultsMultiFilter.pagination !== undefined &&
      emptyResultsMultiFilter.pagination !== null,
  );
  TestValidator.predicate(
    "response has data field",
    Array.isArray(emptyResultsMultiFilter.data),
  );
  TestValidator.predicate(
    "pagination has all required fields",
    emptyResultsMultiFilter.pagination.current !== undefined &&
      emptyResultsMultiFilter.pagination.limit !== undefined &&
      emptyResultsMultiFilter.pagination.records !== undefined &&
      emptyResultsMultiFilter.pagination.pages !== undefined,
  );
}
