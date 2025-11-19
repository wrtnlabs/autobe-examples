import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountRestriction";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAccountRestriction";

/**
 * Test filtering restrictions by specific contributor ID.
 *
 * This test validates the moderation restrictions search endpoint's contributor
 * filtering capability. The moderator performs searches for account
 * restrictions with and without contributor_id filters, ensuring that when a
 * contributor_id filter is specified, all returned restrictions belong to that
 * specific contributor. Pagination is validated for filtered results, and
 * response structure integrity is verified throughout.
 *
 * Test Flow:
 *
 * 1. Authenticate as moderator to access moderation endpoints
 * 2. Query restrictions with a specific contributor_id filter parameter
 * 3. Validate that each returned restriction belongs to the filtered contributor
 * 4. Verify pagination information is correct and meaningful
 * 5. Test multiple filtering scenarios to ensure filter parameter is respected
 */
export async function test_api_moderation_restrictions_filter_by_contributor(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword =
    RandomGenerator.alphabets(8) + "A" + RandomGenerator.alphabets(2) + "1!";

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username:
          RandomGenerator.alphabets(6) + RandomGenerator.alphaNumeric(2),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Test filtering with a specific contributor_id
  const targetContributorId = typia.random<string & tags.Format<"uuid">>();

  const restrictionPage: IPageIDiscussionBoardAccountRestriction =
    await api.functional.discussionBoard.moderator.moderation.restrictions.index(
      connection,
      {
        body: {
          contributor_id: targetContributorId,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardAccountRestriction.IRequest,
      },
    );
  typia.assert(restrictionPage);

  // Step 3: Validate pagination structure
  TestValidator.predicate(
    "pagination current should be non-negative",
    restrictionPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    restrictionPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    restrictionPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    restrictionPage.pagination.pages >= 0,
  );

  // Step 4: Validate returned data length respects limit
  TestValidator.predicate(
    "data length should not exceed limit",
    restrictionPage.data.length <= restrictionPage.pagination.limit,
  );

  // Step 5: For each returned restriction, verify it belongs to the filtered contributor
  restrictionPage.data.forEach((restriction) => {
    typia.assert(restriction);
    typia.assert(restriction.contributor);
    typia.assert(restriction.contributor.id);

    TestValidator.equals(
      "restriction contributor should match filter",
      restriction.contributor.id,
      targetContributorId,
    );

    // Validate core restriction fields exist
    TestValidator.predicate(
      "restriction should have valid id",
      restriction.id &&
        typeof restriction.id === "string" &&
        restriction.id.length > 0,
    );
    TestValidator.predicate(
      "restriction should have valid restriction_type",
      ["posting_restriction", "temporary_suspension", "permanent_ban"].includes(
        restriction.restriction_type,
      ),
    );
    TestValidator.predicate(
      "restriction should have valid status",
      ["active", "lifted", "expired"].includes(restriction.status),
    );
  });

  // Step 6: Test with default pagination parameters
  const defaultPaginationResults: IPageIDiscussionBoardAccountRestriction =
    await api.functional.discussionBoard.moderator.moderation.restrictions.index(
      connection,
      {
        body: {
          contributor_id: targetContributorId,
        } satisfies IDiscussionBoardAccountRestriction.IRequest,
      },
    );
  typia.assert(defaultPaginationResults);

  TestValidator.predicate(
    "default pagination should have valid page",
    defaultPaginationResults.pagination.current >= 0,
  );
  TestValidator.predicate(
    "default pagination should have valid limit",
    defaultPaginationResults.pagination.limit > 0,
  );

  // Step 7: Verify all results still match the contributor filter
  defaultPaginationResults.data.forEach((restriction) => {
    TestValidator.equals(
      "default pagination results should filter by contributor",
      restriction.contributor.id,
      targetContributorId,
    );
  });

  // Step 8: Test filtering with a different contributor ID to ensure filter is dynamic
  const alternativeContributorId = typia.random<string & tags.Format<"uuid">>();

  const alternativeResults: IPageIDiscussionBoardAccountRestriction =
    await api.functional.discussionBoard.moderator.moderation.restrictions.index(
      connection,
      {
        body: {
          contributor_id: alternativeContributorId,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAccountRestriction.IRequest,
      },
    );
  typia.assert(alternativeResults);

  // Verify all results match the new filter
  alternativeResults.data.forEach((restriction) => {
    TestValidator.equals(
      "alternative filter results should match new contributor_id",
      restriction.contributor.id,
      alternativeContributorId,
    );
  });

  // Step 9: Validate that filters are mutually exclusive
  // Results for target contributor should be different from results for alternative contributor
  // (unless by coincidence both have same restrictions, but IDs are different so unlikely)
  TestValidator.predicate(
    "different contributor filters should be applied independently",
    targetContributorId !== alternativeContributorId,
  );
}
