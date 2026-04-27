import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_review_index_filter_by_customer_and_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Fetch all reviews to discover seeded test data
  const allReviews =
    await api.functional.eCommerceMall.administrator.reviews.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IECommerceMallReview.IRequest,
      },
    );
  typia.assert(allReviews);
  // 3. If reviews exist, test customerId filtering
  if (allReviews.data.length > 0) {
    // Group reviews by customer to find distinct customers
    const customerReviewMap = new Map<
      string,
      IECommerceMallReview.ISummary[]
    >();
    for (const review of allReviews.data) {
      const cid = review.customer.id;
      if (!customerReviewMap.has(cid)) {
        customerReviewMap.set(cid, []);
      }
      customerReviewMap.get(cid)!.push(review);
    }
    // Find a non-deleted customer (profile is not null)
    const nonDeletedCustomers: string[] = [];
    const deletedCustomers: string[] = [];
    for (const [cid, reviews] of customerReviewMap) {
      const profile = reviews[0].customer.profile;
      if (profile !== null) {
        nonDeletedCustomers.push(cid);
      } else {
        deletedCustomers.push(cid);
      }
    }
    // Test 1: Filter by a non-deleted customer
    if (nonDeletedCustomers.length > 0) {
      const targetCustomerId = nonDeletedCustomers[0];
      const filteredReviews =
        await api.functional.eCommerceMall.administrator.reviews.index(
          adminConnection,
          {
            body: {
              customerId: targetCustomerId,
              page: 1,
              limit: 100,
            } satisfies IECommerceMallReview.IRequest,
          },
        );
      typia.assert(filteredReviews);
      // Verify all returned reviews have matching customer.id
      for (const review of filteredReviews.data) {
        TestValidator.equals(
          "customer id matches filter",
          review.customer.id,
          targetCustomerId,
        );
      }
      // Verify the first returned review's customer has a display name
      if (
        filteredReviews.data.length > 0 &&
        filteredReviews.data[0].customer.profile !== null
      ) {
        TestValidator.predicate(
          "non-deleted customer has display_name",
          filteredReviews.data[0].customer.profile!.display_name.length > 0,
        );
      }
    }
    // Test 2: Filter by a deleted customer (profile is null)
    if (deletedCustomers.length > 0) {
      const targetDeletedId = deletedCustomers[0];
      const deletedReviews =
        await api.functional.eCommerceMall.administrator.reviews.index(
          adminConnection,
          {
            body: {
              customerId: targetDeletedId,
              page: 1,
              limit: 100,
            } satisfies IECommerceMallReview.IRequest,
          },
        );
      typia.assert(deletedReviews);
      // Verify all returned reviews have customer.profile === null (anonymized)
      for (const review of deletedReviews.data) {
        TestValidator.equals(
          "deleted customer has null profile",
          review.customer.profile,
          null,
        );
      }
    }
    // Test 3: Search by keyword from existing review content
    const reviewsWithContent = allReviews.data.filter(
      (r) => r.content !== null,
    );
    if (reviewsWithContent.length > 0) {
      const sourceReview = reviewsWithContent[0];
      const content = sourceReview.content!;
      const keyword = content.length >= 5 ? content.substring(1, 5) : content;
      const searchResults =
        await api.functional.eCommerceMall.administrator.reviews.index(
          adminConnection,
          {
            body: {
              search: keyword,
              page: 1,
              limit: 100,
            } satisfies IECommerceMallReview.IRequest,
          },
        );
      typia.assert(searchResults);
      // Verify returned reviews contain the keyword in content
      for (const review of searchResults.data) {
        TestValidator.predicate(
          "review content contains search keyword",
          review.content !== null &&
            review.content.toLowerCase().includes(keyword.toLowerCase()),
        );
      }
    }
  }
  // Test 4: Search with non-matching keyword returns empty results
  const noMatchResults =
    await api.functional.eCommerceMall.administrator.reviews.index(
      adminConnection,
      {
        body: {
          search: "zzz_nonexistent_keyword_xyz",
          page: 1,
          limit: 100,
        } satisfies IECommerceMallReview.IRequest,
      },
    );
  typia.assert(noMatchResults);
  TestValidator.equals(
    "non-matching search returns empty data",
    noMatchResults.data.length,
    0,
  );
  TestValidator.equals(
    "non-matching search has records=0",
    noMatchResults.pagination.records,
    0,
  );
}
