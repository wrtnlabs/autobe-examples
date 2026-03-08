import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_reviews_dashboard_deleted_user_attribution(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Customer A joins and creates account
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "CustomerA!2024",
      href: "https://example.com/join",
      referrer: "https://example.com/register",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerA);
  // Step 2: Customer B joins and creates account
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "CustomerB!2024",
      href: "https://example.com/join",
      referrer: "https://example.com/register",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerB);
  // Step 3: Customer B calls dashboard to view all reviews on the platform
  const dashboardResponse =
    await api.functional.ecommerceMall.customer.reviews.dashboard.index(
      customerBConnection,
      {
        body: {
          limit: 20,
          page: 1,
          pageSize: 20,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(dashboardResponse);
  // Step 4: Validate dashboard response structure
  TestValidator.equals(
    "dashboard response has pagination",
    dashboardResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination has current page",
    dashboardResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination has limit between 1-100",
    dashboardResponse.pagination.limit,
    dashboardResponse.pagination.limit >= 1 &&
      dashboardResponse.pagination.limit <= 100
      ? dashboardResponse.pagination.limit
      : 0,
  );
  // Validate pagination consistency
  const expectedPages = Math.ceil(
    dashboardResponse.pagination.records / dashboardResponse.pagination.limit,
  );
  TestValidator.equals(
    "pages calculated correctly",
    dashboardResponse.pagination.pages,
    expectedPages,
  );
  // Step 5: Validate review data structure if any reviews exist
  if (dashboardResponse.data.length > 0) {
    const firstReview = dashboardResponse.data[0];
    typia.assert(firstReview);
    // Verify review has required structure
    TestValidator.equals("review has id", firstReview.id !== undefined, true);
    TestValidator.predicate(
      "review has valid rating",
      () => firstReview.rating >= 1 && firstReview.rating <= 5,
    );
    TestValidator.predicate(
      "review is active",
      () => firstReview.isActive === true,
    );
    TestValidator.equals(
      "review has customer",
      firstReview.customer !== undefined,
      true,
    );
    TestValidator.equals(
      "review has product",
      firstReview.product !== undefined,
      true,
    );
    TestValidator.equals(
      "review has createdAt",
      firstReview.createdAt !== undefined,
      true,
    );
    TestValidator.equals(
      "review has updatedAt",
      firstReview.updatedAt !== undefined,
      true,
    );
    // Test deleted user attribution logic
    if (firstReview.customer.deletedAt !== null) {
      // Customer is deleted, verify customer structure is still accessible
      TestValidator.equals(
        "deleted customer has profile",
        firstReview.customer.customerProfile !== undefined,
        true,
      );
      TestValidator.equals(
        "deleted customer has display name",
        firstReview.customer.customerProfile.displayName !== null,
        true,
      );
    } else {
      // Customer is not deleted, display name should be actual name
      TestValidator.equals(
        "active customer has display name",
        firstReview.customer.customerProfile.displayName !== null,
        true,
      );
    }
  }
  // Step 6: Test dashboard with productId filter (simulate product-specific review filtering)
  const testProductId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const productSpecificResponse =
    await api.functional.ecommerceMall.customer.reviews.dashboard.index(
      customerBConnection,
      {
        body: {
          productId: testProductId,
          limit: 20,
          page: 1,
          pageSize: 20,
          sortBy: "createdAt",
          sortOrder: "desc",
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(productSpecificResponse);
  // Step 7: Verify pagination for filtered results
  TestValidator.equals(
    "filtered response has pagination",
    productSpecificResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "filtered pagination has current page",
    productSpecificResponse.pagination.current,
    1,
  );
  // Step 8: Test rating filter
  const ratingFilteredResponse =
    await api.functional.ecommerceMall.customer.reviews.dashboard.index(
      customerBConnection,
      {
        body: {
          ratingMin: 3,
          ratingMax: 5,
          limit: 20,
          page: 1,
          pageSize: 20,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(ratingFilteredResponse);
  // Validate that all returned reviews meet rating criteria
  if (ratingFilteredResponse.data.length > 0) {
    for (const review of ratingFilteredResponse.data) {
      TestValidator.predicate(
        `review ${review.id} meets rating filter`,
        () => review.rating >= 3 && review.rating <= 5,
      );
    }
  }
  // Step 9: Test date range filter
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);
  const dateFilteredResponse =
    await api.functional.ecommerceMall.customer.reviews.dashboard.index(
      customerBConnection,
      {
        body: {
          createdAtFrom: new Date().toISOString(),
          createdAtTo: futureDate.toISOString(),
          limit: 20,
          page: 1,
          pageSize: 20,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(dateFilteredResponse);
  // Step 10: Test sorting validation
  const sortedResponse =
    await api.functional.ecommerceMall.customer.reviews.dashboard.index(
      customerBConnection,
      {
        body: {
          sortBy: "createdAt",
          sortOrder: "desc",
          limit: 20,
          page: 1,
          pageSize: 20,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(sortedResponse);
  // Verify reviews are sorted by createdAt descending if we have multiple reviews
  if (sortedResponse.data.length >= 2) {
    const firstCreatedAt = new Date(sortedResponse.data[0].createdAt).getTime();
    const secondCreatedAt = new Date(
      sortedResponse.data[1].createdAt,
    ).getTime();
    TestValidator.predicate(
      "reviews are sorted by createdAt descending",
      () => firstCreatedAt >= secondCreatedAt,
    );
  }
}
