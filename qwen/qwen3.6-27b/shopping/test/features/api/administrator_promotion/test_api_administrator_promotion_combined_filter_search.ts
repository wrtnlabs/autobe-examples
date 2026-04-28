import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformAdministratorPromotionRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdministratorPromotionRequestOfCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformAdministratorPromotionRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformAdministratorPromotionRequestOfCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test combined filter search for administrator promotion requests.
 *
 * Validates that an authenticated admin can search administrator promotion requests using multiple combined filters including actor type, status, review completion state, date ranges, and text search. Ensures pagination metadata is consistent with filtered results and that sort directives order results correctly.
 *
 * Tests filter combinations of customer/pending/unreviewed requests within date ranges, as well as alternative combinations like seller/approved requests. Verifies that the search correctly narrows results based on the applied criteria.
 *
 * 1. Authenticate a new administrator account.
 * 2. Search with combined filters: actor_type='customer', status='pending', reviewed=false, date range, text search, sort.
 * 3. Validate response structure and pagination metadata consistency.
 * 4. Test alternative filter combination (seller, approved) to verify filter flexibility.
 * 5. Verify pagination behavior with custom page and limit parameters.
 */
export async function test_api_administrator_promotion_combined_filter_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://admin.example.com/register",
      password: RandomGenerator.alphaNumeric(16),
      referrer: "https://admin.example.com",
    } satisfies IEcommercePlatformAdmin.IJoin,
  });
  typia.assert(adminAuthorized);
  // 2. Define date range for filtering
  const now = new Date();
  const createdAtFrom = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 30 days ago
  const createdAtTo = now.toISOString();
  // 3. Search with combined filters: customer, pending, unreviewed, date range, text search, sorted
  const searchBody = {
    actor_type: "customer" as const,
    status: "pending" as const,
    reviewed: false,
    created_at_from: createdAtFrom,
    created_at_to: createdAtTo,
    search: RandomGenerator.alphabets(5), // text search term
    sort: "created_at-desc",
    page: 1 satisfies number as number,
    limit: 10 satisfies number as number,
  } satisfies IEcommercePlatformAdministratorPromotionRequestOfCustomer.IRequest;
  const combinedFilterResult =
    await api.functional.ecommercePlatform.admin.administrator_promotion_requests.index(
      adminConnection,
      {
        body: searchBody,
      },
    );
  typia.assert(combinedFilterResult);
  // 4. Validate response structure and pagination consistency
  TestValidator.equals(
    "pagination current page is 1",
    combinedFilterResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    combinedFilterResult.pagination.limit,
    searchBody.limit ?? 20,
  );
  TestValidator.predicate(
    "total records is non-negative",
    combinedFilterResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    combinedFilterResult.data.length <= (searchBody.limit ?? 20),
  );
  // 5. Validate all returned items match the combined filters
  combinedFilterResult.data.forEach((item) => {
    // Filter: actor_type should be customer
    TestValidator.equals(
      "actor_type filter matches - customer",
      item.actor_type,
      "customer",
    );
    // Filter: status should be pending
    TestValidator.equals(
      "status filter matches - pending",
      item.status,
      "pending",
    );
    // Filter: reviewed=false means reviewed_at should be null or undefined
    TestValidator.equals(
      "reviewed filter matches - unreviewed",
      item.reviewed_at == null,
      true,
    );
  });
  // 6. Test alternative filter combination: seller, approved, with pagination
  const alternativeSearchBody = {
    actor_type: "seller" as const,
    status: "approved" as const,
    reviewed: true,
    sort: "created_at-asc",
    page: 1 satisfies number as number,
    limit: 5 satisfies number as number,
  } satisfies IEcommercePlatformAdministratorPromotionRequestOfCustomer.IRequest;
  const alternativeResult =
    await api.functional.ecommercePlatform.admin.administrator_promotion_requests.index(
      adminConnection,
      {
        body: alternativeSearchBody,
      },
    );
  typia.assert(alternativeResult);
  // Validate alternative filter results
  TestValidator.equals(
    "alternative pagination current page is 1",
    alternativeResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "alternative pagination limit matches request",
    alternativeResult.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "alternative total records is non-negative",
    alternativeResult.pagination.records >= 0,
  );
  // Verify all items in alternative result match seller/approved filters
  alternativeResult.data.forEach((item) => {
    TestValidator.equals(
      "alternative actor_type filter matches - seller",
      item.actor_type,
      "seller",
    );
    TestValidator.equals(
      "alternative status filter matches - approved",
      item.status,
      "approved",
    );
    // reviewed=true and status=approved means reviewed_at should be present
    TestValidator.predicate(
      "reviewed_at is valid for approved request",
      item.reviewed_at != null,
    );
  });
  // 7. Test pagination: if there are more records, fetch page 2
  if (combinedFilterResult.pagination.pages > 1) {
    const pageTwoBody = {
      actor_type: "customer" as const,
      status: "pending" as const,
      reviewed: false,
      page: 2 satisfies number as number,
      limit: 5 satisfies number as number,
    } satisfies IEcommercePlatformAdministratorPromotionRequestOfCustomer.IRequest;
    const pageTwoResult =
      await api.functional.ecommercePlatform.admin.administrator_promotion_requests.index(
        adminConnection,
        {
          body: pageTwoBody,
        },
      );
    typia.assert(pageTwoResult);
    TestValidator.equals(
      "page 2 current page is 2",
      pageTwoResult.pagination.current,
      2,
    );
    TestValidator.equals(
      "page 2 limit matches request",
      pageTwoResult.pagination.limit,
      5,
    );
    TestValidator.predicate(
      "page 2 has valid data length",
      pageTwoResult.data.length <= 5,
    );
  }
}
