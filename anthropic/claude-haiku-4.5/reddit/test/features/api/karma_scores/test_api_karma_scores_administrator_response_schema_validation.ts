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
 * Validates the response schema of the karma scores API endpoint.
 *
 * This test ensures that the administrator karma scores endpoint returns a
 * properly structured response matching
 * IPageICommunityPlatformKarmaScore.ISummary with all required fields. The test
 * verifies:
 *
 * 1. Authentication: Administrator account creation and authorization
 * 2. Response Structure: Complete pagination metadata and karma score data array
 * 3. Field Validation: Each karma score contains id (UUID), post_karma,
 *    comment_karma, total_karma (all non-negative integers), and updated_at
 *    (ISO 8601 timestamp)
 * 4. Business Rules: Validates that total_karma equals the sum of post_karma and
 *    comment_karma
 *
 * The test follows a complete workflow:
 *
 * 1. Create administrator account via join endpoint
 * 2. Query karma scores with pagination parameters
 * 3. Validate complete response structure via typia.assert
 * 4. Verify business rule: total_karma = post_karma + comment_karma for each
 *    record
 */
export async function test_api_karma_scores_administrator_response_schema_validation(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    username: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminData,
    });
  typia.assert(administrator);

  // Step 2: Query karma scores with pagination parameters
  const requestBody = {
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformKarmaScore.IRequest;

  const response: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.administrator.karmaScores.index(
      connection,
      {
        body: requestBody,
      },
    );

  // Step 3: Validate the complete response schema structure
  typia.assert(response);

  // Step 4: Validate business rule for each karma score in the response
  for (const karmaSummary of response.data) {
    // Verify total_karma equals the sum of post_karma and comment_karma
    TestValidator.equals(
      "total_karma equals sum of post_karma and comment_karma",
      karmaSummary.total_karma,
      karmaSummary.post_karma + karmaSummary.comment_karma,
    );
  }

  // Step 5: Verify pagination structure exists and data array is present
  TestValidator.predicate(
    "response contains pagination metadata and data array",
    response.pagination !== undefined &&
      response.data !== undefined &&
      Array.isArray(response.data),
  );
}
