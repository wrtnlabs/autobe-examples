import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
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
import { generate_random_ecommerce_mall_customer_reviews_create } from "../../../generate/generate_random_ecommerce_mall_customer_reviews_create";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";

/**
 * Test customer review snapshots cursor (offset) pagination.
 *
 * Validates the pagination functionality of the review snapshots endpoint:
 * 1. Authenticates as customer
 * 2. Creates a review (which creates initial snapshot)
 * 3. Calls pagination endpoint with limit parameter
 * 4. Iterates through all pages using offset navigation
 * 5. Validates no duplicate snapshots across pages
 * 6. Verifies pagination metadata is accurate
 */
export async function test_api_customer_review_snapshots_cursor_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorizedCustomer = await authorize_customer_join(customerConnection, {
    body: {},
  });
  typia.assert(authorizedCustomer);
  // Step 2: Create a review to test snapshot pagination
  const review = await generate_random_ecommerce_mall_customer_reviews_create(
    customerConnection,
    {},
  );
  typia.assert(review);
  // Step 3: Test snapshot pagination
  const limit: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  // Fetch first page to validate pagination structure
  const firstPage =
    await api.functional.ecommerceMall.customer.reviews.snapshots.index(
      customerConnection,
      {
        reviewId: review.id,
        body: {
          page: 1,
          limit,
          sort: {
            field: "created_at",
            direction: "desc",
          },
        } satisfies IEcommerceMallReview.ISnapshotRequest,
      },
    );
  typia.assert(firstPage);
  // Validate first page structure
  TestValidator.predicate(
    "first page should have pagination",
    firstPage.pagination !== undefined,
  );
  TestValidator.equals(
    "first page current is 1",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit matches",
    firstPage.pagination.limit,
    limit,
  );
  // Collect snapshots across all pages to check for duplicates
  const allSnapshotIds = new Set<string>();
  let currentPage = 1;
  let hasMorePages = true;
  const totalPages = firstPage.pagination.pages;
  const totalRecords = firstPage.pagination.records;
  // Loop through all pages
  while (hasMorePages) {
    const pageResult =
      await api.functional.ecommerceMall.customer.reviews.snapshots.index(
        customerConnection,
        {
          reviewId: review.id,
          body: {
            page: currentPage,
            limit,
            sort: {
              field: "created_at",
              direction: "desc",
            },
          } satisfies IEcommerceMallReview.ISnapshotRequest,
        },
      );
    typia.assert(pageResult);
    // Validate current page number
    TestValidator.equals(
      `page ${currentPage} current matches request`,
      pageResult.pagination.current,
      currentPage,
    );
    // Check for duplicates
    for (const snapshot of pageResult.data) {
      TestValidator.predicate(
        `snapshot ${snapshot.id} should be unique`,
        !allSnapshotIds.has(snapshot.id),
      );
      allSnapshotIds.add(snapshot.id);
    }
    // Check if we've reached the last page
    if (currentPage >= totalPages || pageResult.data.length === 0) {
      hasMorePages = false;
    } else {
      currentPage++;
    }
  }
  // Step 4: Validate final results
  TestValidator.equals(
    "total collected snapshots equals records count",
    allSnapshotIds.size,
    totalRecords,
  );
  TestValidator.equals(
    "last page number matches total pages",
    currentPage,
    totalPages,
  );
}
