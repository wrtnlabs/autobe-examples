import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import type { IEcommerceReviewFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceReviewFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceReviewFlag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_review_flag_search_complex_date_and_status_criteria(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Since we cannot create review flags through API (endpoint not available),
  // we'll test the search functionality with existing data and comprehensive filters
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  // Execute search with comprehensive filters targeting resolved flags
  const searchBody: IEcommerceReviewFlag.IRequest = {
    status: "resolved",
    created_at_from: twoWeeksAgo.toISOString(),
    created_at_to: now.toISOString(),
    assigned_at_from: oneWeekAgo.toISOString(),
    assigned_at_to: now.toISOString(),
    resolved_at_from: oneWeekAgo.toISOString(),
    resolved_at_to: now.toISOString(),
    search: "", // Empty search to avoid filtering by text
    page: 1,
    limit: 10,
  } satisfies IEcommerceReviewFlag.IRequest;
  const searchResult =
    await api.functional.ecommerce.administrator.review_flags.index(
      adminConnection,
      { body: searchBody },
    );
  typia.assert(searchResult);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", searchResult.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    searchResult.pagination.pages >= 0,
  );
  // Validate each returned flag meets the status criteria
  for (const flag of searchResult.data) {
    TestValidator.equals("flag status resolved", flag.status, "resolved");
    // Validate creation date is within specified range
    const createdAt = new Date(flag.created_at);
    TestValidator.predicate(
      "created_at within range",
      createdAt >= twoWeeksAgo && createdAt <= now,
    );
    // For resolved flags with administrator assignment, validate assignment date
    if (flag.administrator !== null) {
      // Note: The ISummary doesn't include assigned_at field, so we can't validate this
      // This is a limitation of the available DTO structure
    }
    // Note: The ISummary doesn't include resolved_at field, so we can't validate resolution date
    // This is a limitation of the available DTO structure
  }
  // Test pagination behavior if there are enough records
  if (searchResult.pagination.pages > 1) {
    const page2Body: IEcommerceReviewFlag.IRequest = {
      ...searchBody,
      page: 2,
    } satisfies IEcommerceReviewFlag.IRequest;
    const page2Result =
      await api.functional.ecommerce.administrator.review_flags.index(
        adminConnection,
        { body: page2Body },
      );
    typia.assert(page2Result);
    TestValidator.equals(
      "page 2 current page",
      page2Result.pagination.current,
      2,
    );
    TestValidator.equals("page 2 limit", page2Result.pagination.limit, 10);
    // Ensure pages have different data if both have records
    if (searchResult.data.length > 0 && page2Result.data.length > 0) {
      TestValidator.notEquals(
        "page 1 and page 2 have different data",
        searchResult.data[0].id,
        page2Result.data[0].id,
      );
    }
  }
  // Test text search functionality with a simple search
  const textSearchBody: IEcommerceReviewFlag.IRequest = {
    status: "resolved",
    search: "a", // Simple search term that might match common text
    page: 1,
    limit: 5,
  } satisfies IEcommerceReviewFlag.IRequest;
  const textSearchResult =
    await api.functional.ecommerce.administrator.review_flags.index(
      adminConnection,
      { body: textSearchBody },
    );
  typia.assert(textSearchResult);
  // Validate the search returned results (may be empty if no matches)
  TestValidator.predicate(
    "text search returns valid pagination",
    textSearchResult.pagination.records >= 0,
  );
}
