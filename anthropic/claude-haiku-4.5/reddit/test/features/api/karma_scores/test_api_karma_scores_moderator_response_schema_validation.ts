import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaScore";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaScore";

/**
 * Validates moderator response schema for karma scores endpoint.
 *
 * This test verifies that the moderator endpoint returns karma score data with
 * complete schema structure including all required fields (id, post_karma,
 * comment_karma, total_karma, updated_at) and proper pagination metadata. The
 * test authenticates as a moderator and retrieves karma score summaries,
 * ensuring response types match specification and data integrity is
 * maintained.
 *
 * Steps:
 *
 * 1. Authenticate as moderator with valid credentials
 * 2. Call karma scores endpoint with various pagination parameters
 * 3. Validate response structure conforms to
 *    IPageICommunityPlatformKarmaScore.ISummary
 * 4. Verify all required fields are present in karma score records
 * 5. Validate pagination metadata (current, limit, records, pages)
 * 6. Ensure karma values are non-negative integers
 * 7. Validate UUID format for id fields
 * 8. Check timestamp format compliance (ISO 8601)
 * 9. Confirm data array contains properly formatted ISummary objects
 */
export async function test_api_karma_scores_moderator_response_schema_validation(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(10);
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderatorHref = "https://community.example.com/auth/moderator/register";
  const moderatorReferrer = "https://community.example.com/";

  const moderatorAuth: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: moderatorPassword,
        href: moderatorHref,
        referrer: moderatorReferrer,
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderatorAuth);
  TestValidator.predicate(
    "moderator account created successfully",
    moderatorAuth.id !== undefined &&
      moderatorAuth.username === moderatorUsername,
  );

  // Step 2: Call karma scores endpoint with pagination parameters
  const requestBody = {
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformKarmaScore.IRequest;

  const karmaScoresResponse: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.moderator.karmaScores.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(karmaScoresResponse);

  // Step 3: Validate response structure
  TestValidator.predicate(
    "response has pagination property",
    karmaScoresResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "response has data array property",
    Array.isArray(karmaScoresResponse.data),
  );

  // Step 4: Validate pagination metadata structure
  const pagination = karmaScoresResponse.pagination;
  TestValidator.predicate(
    "pagination has current property",
    typeof pagination.current === "number" && pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit property",
    typeof pagination.limit === "number" && pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records property",
    typeof pagination.records === "number" && pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages property",
    typeof pagination.pages === "number" && pagination.pages >= 0,
  );

  // Step 5: Validate each karma score record in the data array
  if (karmaScoresResponse.data.length > 0) {
    karmaScoresResponse.data.forEach((karmaSummary, index) => {
      // Validate all required fields are present
      TestValidator.predicate(
        `karma score record ${index} has id field`,
        karmaSummary.id !== undefined && typeof karmaSummary.id === "string",
      );
      TestValidator.predicate(
        `karma score record ${index} has post_karma field`,
        typeof karmaSummary.post_karma === "number" &&
          karmaSummary.post_karma >= 0,
      );
      TestValidator.predicate(
        `karma score record ${index} has comment_karma field`,
        typeof karmaSummary.comment_karma === "number" &&
          karmaSummary.comment_karma >= 0,
      );
      TestValidator.predicate(
        `karma score record ${index} has total_karma field`,
        typeof karmaSummary.total_karma === "number" &&
          karmaSummary.total_karma >= 0,
      );
      TestValidator.predicate(
        `karma score record ${index} has updated_at field`,
        karmaSummary.updated_at !== undefined &&
          typeof karmaSummary.updated_at === "string",
      );

      // Validate total_karma is sum of post_karma and comment_karma
      TestValidator.equals(
        `total_karma equals post_karma + comment_karma for record ${index}`,
        karmaSummary.total_karma,
        karmaSummary.post_karma + karmaSummary.comment_karma,
      );

      // Validate UUID format for id
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      TestValidator.predicate(
        `karma score record ${index} id is valid UUID format`,
        uuidRegex.test(karmaSummary.id),
      );

      // Validate ISO 8601 datetime format
      TestValidator.predicate(
        `karma score record ${index} updated_at is ISO 8601 format`,
        !isNaN(Date.parse(karmaSummary.updated_at)),
      );
    });
  }

  // Step 6: Test with different pagination parameters
  const secondRequestBody = {
    page: 1,
    limit: 5,
    orderBy: "total_karma",
    order: "desc",
  } satisfies ICommunityPlatformKarmaScore.IRequest;

  const secondResponse: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.moderator.karmaScores.index(
      connection,
      {
        body: secondRequestBody,
      },
    );
  typia.assert(secondResponse);

  TestValidator.predicate(
    "second response pagination limit matches request",
    secondResponse.pagination.limit === 5,
  );
  TestValidator.predicate(
    "second response data array length respects limit",
    secondResponse.data.length <= 5,
  );

  // Step 7: Validate schema consistency
  TestValidator.equals(
    "schema structure consistent across requests",
    typeof secondResponse.pagination.current,
    typeof karmaScoresResponse.pagination.current,
  );
  TestValidator.equals(
    "data array structure consistent across requests",
    Array.isArray(secondResponse.data),
    Array.isArray(karmaScoresResponse.data),
  );
}
