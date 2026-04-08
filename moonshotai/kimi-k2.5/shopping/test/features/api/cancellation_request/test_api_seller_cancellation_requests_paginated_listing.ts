import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_cancellation_requests_paginated_listing(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://test.com/seller/registration",
      referrer: "https://test.com/seller/registration",
      ip: null,
    },
  });
  // Step 2: Test pagination with default parameters
  const firstPage =
    await api.functional.ecommerceMall.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          limit: 10,
          page: 1,
          sortBy: "createdAt",
          sortOrder: "desc",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(firstPage);
  // Validate pagination metadata
  TestValidator.predicate(
    "first page pagination current should be 1",
    firstPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "first page pagination limit should be 10",
    firstPage.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data array length should not exceed limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  // Step 3: Test second page if data exists
  if (firstPage.pagination.pages > 1) {
    const secondPage =
      await api.functional.ecommerceMall.seller.cancellation_requests.index(
        sellerConnection,
        {
          body: {
            limit: 10,
            page: 2,
            sortBy: "createdAt",
            sortOrder: "desc",
          } satisfies IEcommerceMallCancellationRequest.IRequest,
        },
      );
    typia.assert(secondPage);
    // Validate pagination metadata for second page
    TestValidator.equals(
      "second page current should be 2",
      secondPage.pagination.current,
      2 satisfies number as number,
    );
    // Validate no duplicates between pages
    const firstPageIds = new Set(firstPage.data.map((item) => item.id));
    const secondPageIds = secondPage.data.map((item) => item.id);
    const hasDuplicates = secondPageIds.some((id) => firstPageIds.has(id));
    TestValidator.predicate("no duplicate items across pages", !hasDuplicates);
    // Validate consistent total count
    TestValidator.equals(
      "total records consistent across pages",
      firstPage.pagination.records,
      secondPage.pagination.records satisfies number as number,
    );
  }
  // Step 4: Test with different limit value
  const smallPage =
    await api.functional.ecommerceMall.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          limit: 5,
          page: 1,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(smallPage);
  TestValidator.equals(
    "custom limit applied correctly",
    smallPage.pagination.limit,
    5 satisfies number as number,
  );
  TestValidator.predicate(
    "small page data length should not exceed limit",
    smallPage.data.length <= 5,
  );
  // Step 5: Test sorting options
  const sortedPage =
    await api.functional.ecommerceMall.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          limit: 10,
          page: 1,
          sortBy: "status",
          sortOrder: "asc",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(sortedPage);
  // Step 6: Test filtering by status
  const pendingFilter =
    await api.functional.ecommerceMall.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          status: "pending",
          limit: 10,
          page: 1,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(pendingFilter);
  // Verify filtered results have correct status
  const allPending = pendingFilter.data.every(
    (item) => item.status === "pending",
  );
  TestValidator.predicate(
    "all filtered results have pending status",
    allPending || pendingFilter.data.length === 0,
  );
  // Step 7: Test edge case - request beyond available pages
  const farPage =
    await api.functional.ecommerceMall.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          limit: 10,
          page: 1000,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(farPage);
  TestValidator.predicate(
    "far page should return empty data array",
    farPage.data.length === 0 ||
      farPage.pagination.current <= farPage.pagination.pages,
  );
}
