import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVote";

/**
 * Test administrator retrieval of paginated voting records.
 *
 * Validates that administrators can successfully authenticate and retrieve
 * paginated voting records from the community platform. This test ensures:
 *
 * 1. Administrator account creation and authentication via join endpoint
 * 2. Successful retrieval of voting records with pagination
 * 3. Correct pagination metadata (current page, limit, total records, total pages)
 * 4. Default pagination settings (limit 20, page 1)
 * 5. Proper response structure with data array and pagination object
 *
 * The test flow:
 *
 * 1. Create and authenticate as an administrator
 * 2. Retrieve voting records using default pagination parameters
 * 3. Validate pagination metadata accuracy
 * 4. Verify response contains properly typed vote records
 */
export async function test_api_voting_records_administrator_retrieval_by_page(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: undefined,
        ip: undefined,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);
  TestValidator.equals(
    "administrator email matches",
    administrator.email,
    adminEmail,
  );

  // Step 2: Retrieve voting records with default pagination
  const voteRecords: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.administrator.votes.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(voteRecords);

  // Step 3: Validate pagination metadata
  TestValidator.predicate(
    "pagination object exists",
    voteRecords.pagination !== undefined,
  );
  TestValidator.equals("current page is 1", voteRecords.pagination.current, 1);
  TestValidator.equals("page limit is 20", voteRecords.pagination.limit, 20);
  TestValidator.predicate(
    "total records is non-negative",
    voteRecords.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    voteRecords.pagination.pages >= 0,
  );

  // Step 4: Validate data array structure
  TestValidator.predicate(
    "data array is array type",
    Array.isArray(voteRecords.data),
  );
  TestValidator.predicate(
    "data array length does not exceed limit",
    voteRecords.data.length <= 20,
  );

  // Step 5: Validate individual vote records if they exist
  if (voteRecords.data.length > 0) {
    const firstVote: ICommunityPlatformVote = voteRecords.data[0];
    typia.assert(firstVote);
    TestValidator.predicate("vote has id", firstVote.id !== undefined);
    TestValidator.predicate(
      "vote has member info",
      firstVote.member !== undefined,
    );
    TestValidator.predicate(
      "vote type is valid",
      firstVote.vote_type === "upvote" || firstVote.vote_type === "downvote",
    );
    TestValidator.predicate(
      "content type is valid",
      firstVote.content_type === "post" || firstVote.content_type === "comment",
    );
  }
}
