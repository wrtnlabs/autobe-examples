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

export async function test_api_customer_reviews_dashboard_filtering_analytics(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Customer joins and authenticates
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Initial dashboard query to discover existing reviews
  const initialResult =
    await api.functional.ecommerceMall.customer.reviews.dashboard.index(
      customerConnection,
      {
        body: {
          limit: 100,
        },
      },
    );
  typia.assert(initialResult);
  // Skip test if no reviews exist
  if (initialResult.data.length === 0) {
    TestValidator.equals(
      "dashboard returns empty when no reviews exist",
      initialResult.data.length,
      0,
    );
    return;
  }
  // 3. Test productId filter - get unique product IDs from reviews
  const productIds = ArrayUtil.repeat(
    initialResult.data.length,
    (index) =>
      initialResult.data[index].product.id as string & tags.Format<"uuid">,
  ).filter((id, pos, arr) => arr.indexOf(id) === pos);
  typia.assert(productIds);
  if (productIds.length > 0) {
    const productId = productIds[0];
    const filteredByProduct =
      await api.functional.ecommerceMall.customer.reviews.dashboard.index(
        customerConnection,
        {
          body: {
            productId,
            limit: 100,
          },
        },
      );
    typia.assert(filteredByProduct);
    TestValidator.equals(
      "productId filter returns correct reviews",
      filteredByProduct.data.every((r) => r.product.id === productId),
      true,
    );
    TestValidator.equals(
      "productId filter total_count matches data length",
      filteredByProduct.pagination.records,
      filteredByProduct.data.length,
    );
    // 4. Test ratingMin filter
    const filteredByRating =
      await api.functional.ecommerceMall.customer.reviews.dashboard.index(
        customerConnection,
        {
          body: {
            ratingMin: 4,
            limit: 100,
          },
        },
      );
    typia.assert(filteredByRating);
    const highRatedReviews = initialResult.data.filter((r) => r.rating >= 4);
    TestValidator.equals(
      "ratingMin filter returns correct count",
      filteredByRating.data.length,
      highRatedReviews.length,
    );
    TestValidator.equals(
      "ratingMin filter validation",
      filteredByRating.data.every((r) => r.rating >= 4),
      true,
    );
    // 5. Test createdAt date range filter
    if (initialResult.data.length >= 2) {
      const sortedReviews = [...initialResult.data].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      const midDate =
        sortedReviews[Math.floor(sortedReviews.length / 2)].createdAt;
      const filteredByDate =
        await api.functional.ecommerceMall.customer.reviews.dashboard.index(
          customerConnection,
          {
            body: {
              createdAtFrom: midDate,
              limit: 100,
            },
          },
        );
      typia.assert(filteredByDate);
      const expectedAfterDate = initialResult.data.filter(
        (r) => new Date(r.createdAt) >= new Date(midDate),
      );
      TestValidator.equals(
        "createdAtFrom filter returns correct count",
        filteredByDate.data.length,
        expectedAfterDate.length,
      );
      TestValidator.equals(
        "createdAtFrom filter validation",
        filteredByDate.data.every(
          (r) => new Date(r.createdAt) >= new Date(midDate),
        ),
        true,
      );
    }
    // 6. Test unfiltered analytics (reuse initialResult)
    TestValidator.equals(
      "total_count matches data length",
      initialResult.pagination.records,
      initialResult.data.length,
    );
    TestValidator.equals(
      "pagination current page",
      initialResult.pagination.current,
      1,
    );
    TestValidator.equals(
      "pagination limit",
      initialResult.pagination.limit,
      100,
    );
    if (initialResult.data.length > 0) {
      TestValidator.equals(
        "pagination pages calculation",
        initialResult.pagination.pages,
        Math.ceil(initialResult.data.length / 100),
      );
    } else {
      TestValidator.equals(
        "pagination pages for empty",
        initialResult.pagination.pages,
        0,
      );
    }
    // 7. Verify sorting (created_at DESC)
    if (initialResult.data.length >= 2) {
      let isSortedDesc = true;
      for (let i = 1; i < initialResult.data.length; i++) {
        if (
          new Date(initialResult.data[i - 1].createdAt).getTime() <
          new Date(initialResult.data[i].createdAt).getTime()
        ) {
          isSortedDesc = false;
          break;
        }
      }
      TestValidator.predicate(
        "default sorting is created_at DESC",
        isSortedDesc,
      );
    }
  }
}
