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

export async function test_api_moderation_restrictions_search_basic(
  connection: api.IConnection,
) {
  /**
   * Step 1: Register and authenticate as a moderator Creates a new moderator
   * account with full moderation permissions
   */
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword =
    RandomGenerator.alphabets(8).toUpperCase() +
    RandomGenerator.alphabets(8) +
    "1!" +
    RandomGenerator.alphabets(2);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: RandomGenerator.alphabets(8),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);
  TestValidator.equals(
    "moderator authenticated",
    moderator.email,
    moderatorEmail,
  );

  /**
   * Step 2: Search account restrictions with default pagination Retrieves all
   * restrictions without any filters using default pagination settings
   */
  const searchRequest =
    {} satisfies IDiscussionBoardAccountRestriction.IRequest;

  const restrictionPage =
    await api.functional.discussionBoard.moderator.moderation.restrictions.index(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert(restrictionPage);

  /**
   * Step 3: Validate pagination metadata Verifies that the response contains
   * proper pagination information
   */
  TestValidator.equals(
    "pagination exists",
    restrictionPage.pagination !== undefined &&
      restrictionPage.pagination !== null,
    true,
  );
  TestValidator.predicate(
    "current page is valid",
    restrictionPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is positive",
    restrictionPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "total records is non-negative",
    restrictionPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    restrictionPage.pagination.pages >= 0,
  );

  /**
   * Step 4: Validate pagination consistency Ensures that pagination values are
   * mathematically consistent
   */
  const expectedPages = Math.ceil(
    restrictionPage.pagination.records / restrictionPage.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation is correct",
    restrictionPage.pagination.pages,
    expectedPages,
  );

  /**
   * Step 5: Validate restriction data structure Verifies that each restriction
   * record contains all required fields
   */
  if (restrictionPage.data && restrictionPage.data.length > 0) {
    const firstRestriction = restrictionPage.data[0];

    // Validate restriction has all required fields
    TestValidator.equals(
      "restriction has id",
      typeof firstRestriction.id === "string",
      true,
    );
    TestValidator.equals(
      "restriction type is valid",
      ["posting_restriction", "temporary_suspension", "permanent_ban"].includes(
        firstRestriction.restriction_type,
      ),
      true,
    );
    TestValidator.equals(
      "reason exists",
      typeof firstRestriction.reason === "string",
      true,
    );
    TestValidator.equals(
      "imposed_at exists",
      typeof firstRestriction.imposed_at === "string",
      true,
    );
    TestValidator.equals(
      "expires_at is null or valid date",
      firstRestriction.expires_at === null ||
        typeof firstRestriction.expires_at === "string",
      true,
    );
    TestValidator.equals(
      "lifted_at is null or valid date",
      firstRestriction.lifted_at === null ||
        typeof firstRestriction.lifted_at === "string",
      true,
    );

    // Validate contributor information
    TestValidator.equals(
      "contributor exists",
      firstRestriction.contributor !== undefined &&
        firstRestriction.contributor !== null,
      true,
    );
    TestValidator.equals(
      "contributor has id",
      typeof firstRestriction.contributor.id === "string",
      true,
    );
    TestValidator.equals(
      "contributor has username",
      typeof firstRestriction.contributor.username === "string",
      true,
    );

    // Validate imposed_by_moderator information
    TestValidator.equals(
      "imposed_by_moderator exists",
      firstRestriction.imposed_by_moderator !== undefined &&
        firstRestriction.imposed_by_moderator !== null,
      true,
    );
    TestValidator.equals(
      "imposed_by_moderator has id",
      typeof firstRestriction.imposed_by_moderator.id === "string",
      true,
    );
    TestValidator.equals(
      "imposed_by_moderator has username",
      typeof firstRestriction.imposed_by_moderator.username === "string",
      true,
    );

    // Validate lifted_by_moderator (can be null)
    TestValidator.equals(
      "lifted_by_moderator is null or valid",
      firstRestriction.lifted_by_moderator === null ||
        (firstRestriction.lifted_by_moderator.id !== undefined &&
          firstRestriction.lifted_by_moderator.username !== undefined),
      true,
    );

    // Validate status
    TestValidator.equals(
      "status is valid",
      ["active", "lifted", "expired"].includes(firstRestriction.status),
      true,
    );
  }

  /**
   * Step 6: Verify data array consistency Ensures that the number of returned
   * records matches the limit
   */
  TestValidator.predicate(
    "returned records do not exceed limit",
    restrictionPage.data.length <= restrictionPage.pagination.limit,
  );
}
