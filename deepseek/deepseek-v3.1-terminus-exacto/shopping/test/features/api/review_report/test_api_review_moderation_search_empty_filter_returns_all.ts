import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import type { IEcommerceReviewReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceReviewReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceReviewReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test that the review moderation search endpoint returns all reports with proper pagination when no filters are provided.
 */
export async function test_api_review_moderation_search_empty_filter_returns_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test-password-123",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // 2. Search request with only pagination parameters
  const requestBody = {
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 5 satisfies number &
      tags.Type<"int32"> &
      tags.Default<20> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IEcommerceReviewReport.IRequest;
  // 3. Call the moderation search endpoint
  const response: IPageIEcommerceReviewReport.ISummary =
    await api.functional.ecommerce.administrator.moderation.reviews.index(
      adminConnection,
      { body: requestBody },
    );
  typia.assert(response);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "current page matches request",
    response.pagination.current,
    requestBody.page!,
  );
  TestValidator.equals(
    "limit matches request",
    response.pagination.limit,
    requestBody.limit!,
  );
  TestValidator.predicate(
    "total records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 5. Validate each review report summary structure
  for (const report of response.data) {
    typia.assert(report);
    TestValidator.predicate("has report category", !!report.report_category);
    TestValidator.predicate("has created_at timestamp", !!report.created_at);
    TestValidator.predicate("has updated_at timestamp", !!report.updated_at);
    typia.assert(report.customer);
    typia.assert(report.review);
    // Validate nested structure without redundant checks after typia.assert
    TestValidator.predicate("customer has email", !!report.customer.email);
    TestValidator.predicate(
      "review has valid rating",
      report.review.rating >= 1 && report.review.rating <= 5,
    );
  }
  // 6. Validate pagination calculation consistency
  if (response.pagination.records > 0) {
    const expectedPages = Math.ceil(
      response.pagination.records / response.pagination.limit,
    );
    TestValidator.equals(
      "pagination pages calculation",
      response.pagination.pages,
      expectedPages,
    );
  } else {
    TestValidator.equals(
      "empty records has zero pages",
      response.pagination.pages,
      0,
    );
  }
}
