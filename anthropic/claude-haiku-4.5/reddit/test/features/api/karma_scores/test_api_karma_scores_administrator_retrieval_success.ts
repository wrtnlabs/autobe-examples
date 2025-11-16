import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaScore";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaScore";

/**
 * Test successful retrieval of all member karma scores by an administrator.
 *
 * This test validates that an administrator can query the complete list of
 * member karma scores with proper pagination and filtering support. The test
 * verifies:
 *
 * 1. Administrator authentication and account creation
 * 2. Successful retrieval of paginated karma score list
 * 3. Response includes karma summaries with total_karma, post_karma,
 *    comment_karma, and updated_at timestamps
 * 4. Default pagination works correctly without explicit page/limit parameters
 * 5. Response structure matches IPageICommunityPlatformKarmaScore.ISummary with
 *    pagination metadata
 *
 * The scenario simulates an administrator accessing platform analytics to
 * monitor member reputation metrics and community engagement patterns.
 */
export async function test_api_karma_scores_administrator_retrieval_success(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account with authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: null,
        ip: undefined,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Verify administrator was created successfully
  TestValidator.equals(
    "administrator account status should be active",
    administrator.account_status,
    "active",
  );

  // Step 2: Retrieve karma scores with default pagination
  const karmaScoresPage: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.administrator.karmaScores.index(
      connection,
      {
        body: {} satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  typia.assert(karmaScoresPage);

  // Step 3: Validate pagination metadata exists and is valid
  TestValidator.predicate(
    "pagination should be defined",
    karmaScoresPage.pagination !== undefined &&
      karmaScoresPage.pagination !== null,
  );

  // Step 4: Validate karma scores data array exists
  TestValidator.predicate(
    "karma scores data should be an array",
    Array.isArray(karmaScoresPage.data),
  );

  // Step 5: Validate each karma score summary if data exists
  if (karmaScoresPage.data.length > 0) {
    const karmaScore = karmaScoresPage.data[0];

    // Verify total_karma is the sum of post_karma and comment_karma
    TestValidator.equals(
      "total_karma should be sum of post_karma and comment_karma",
      karmaScore.total_karma,
      karmaScore.post_karma + karmaScore.comment_karma,
    );
  }

  // Step 6: Confirm response structure is complete and matches expected format
  TestValidator.predicate(
    "response should have both pagination and data fields",
    karmaScoresPage.pagination !== undefined &&
      karmaScoresPage.data !== undefined &&
      Array.isArray(karmaScoresPage.data),
  );
}
