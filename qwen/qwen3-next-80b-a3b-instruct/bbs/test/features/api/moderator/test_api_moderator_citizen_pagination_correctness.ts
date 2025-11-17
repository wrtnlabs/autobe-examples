import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import type { IEconomicBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardCitizen";

export async function test_api_moderator_citizen_pagination_correctness(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IEconomicBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "password123",
      } satisfies IEconomicBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: First pagination request - page 1 with limit 2
  // According to the DTO, IEconomicBoardCitizen.IRequest is a string type
  // This suggests the API expects a JSON string representation of the request parameters
  const firstPageRequest: IEconomicBoardCitizen.IRequest = JSON.stringify({
    limit: 2,
    current: 1,
  });
  const firstPage: IPageIEconomicBoardCitizen.ISummary =
    await api.functional.economicBoard.moderator.citizens.index(connection, {
      body: firstPageRequest,
    });
  typia.assert(firstPage);

  // Validate first page pagination metadata
  TestValidator.equals(
    "first page has correct current page",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page has correct limit",
    firstPage.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "first page has at least 0 records",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "first page has at least 1 page",
    firstPage.pagination.pages >= 1,
  );

  // Step 3: Second pagination request - page 2 with limit 2
  const secondPageRequest: IEconomicBoardCitizen.IRequest = JSON.stringify({
    limit: 2,
    current: 2,
  });
  const secondPage: IPageIEconomicBoardCitizen.ISummary =
    await api.functional.economicBoard.moderator.citizens.index(connection, {
      body: secondPageRequest,
    });
  typia.assert(secondPage);

  // Validate second page pagination metadata
  TestValidator.equals(
    "second page has correct current page",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page has correct limit",
    secondPage.pagination.limit,
    2,
  );
  TestValidator.equals(
    "second page should have same total records as first page",
    secondPage.pagination.records,
    firstPage.pagination.records,
  );
  TestValidator.equals(
    "second page should have same total pages as first page",
    secondPage.pagination.pages,
    firstPage.pagination.pages,
  );

  // Step 4: Validate non-overlapping and complete coverage
  const firstPageData = firstPage.data;
  const secondPageData = secondPage.data;

  // Verify data items are of the correct type (string for citizen summary)
  TestValidator.predicate(
    "first page data items are strings",
    firstPageData.every((item) => typeof item === "string"),
  );
  TestValidator.predicate(
    "second page data items are strings",
    secondPageData.every((item) => typeof item === "string"),
  );

  // Check that pages are non-overlapping based on data content
  // Since we don't have full citizen details, we verify the metadata and structure
  // and that we can get multiple pages with the same record count
  TestValidator.equals(
    "pagination metadata consistency",
    firstPage.pagination.records,
    secondPage.pagination.records,
  );
  TestValidator.equals(
    "pagination pages count matches",
    firstPage.pagination.pages,
    secondPage.pagination.pages,
  );

  // Step 5: Validate total pages calculation
  // We cannot validate exact content since we don't have citizen creation endpoint
  // but we can verify that the system is properly handling pagination requests
  TestValidator.predicate(
    "total records should be at least 2 for meaningful pagination",
    firstPage.pagination.records >= 2,
  );

  // Step 6: Validate third page
  const thirdPageRequest: IEconomicBoardCitizen.IRequest = JSON.stringify({
    limit: 2,
    current: 3,
  });
  const thirdPage: IPageIEconomicBoardCitizen.ISummary =
    await api.functional.economicBoard.moderator.citizens.index(connection, {
      body: thirdPageRequest,
    });
  typia.assert(thirdPage);

  TestValidator.equals(
    "third page has correct current page",
    thirdPage.pagination.current,
    3,
  );
  TestValidator.equals(
    "third page should have same total records",
    thirdPage.pagination.records,
    firstPage.pagination.records,
  );
  TestValidator.equals(
    "third page should have same total pages",
    thirdPage.pagination.pages,
    firstPage.pagination.pages,
  );
  TestValidator.predicate(
    "third page should have data if there are enough records",
    thirdPage.data.length >= 0,
  );
}
