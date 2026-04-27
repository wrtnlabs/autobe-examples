import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_review_filter_by_rating_and_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Test rating range filter [3, 5]
  const highRatingPage =
    await api.functional.eCommerceMall.customer.reviews.index(
      customerConnection,
      {
        body: {
          minRating: 3 satisfies number as number,
          maxRating: 5 satisfies number as number,
        } satisfies IECommerceMallReview.IRequest,
      },
    );
  typia.assert(highRatingPage);
  for (const review of highRatingPage.data)
    TestValidator.predicate(
      "rating between 3 and 5",
      () => review.rating >= 3 && review.rating <= 5,
    );
  // 3. Test rating range filter [1, 2]
  const lowRatingPage =
    await api.functional.eCommerceMall.customer.reviews.index(
      customerConnection,
      {
        body: {
          minRating: 1 satisfies number as number,
          maxRating: 2 satisfies number as number,
        } satisfies IECommerceMallReview.IRequest,
      },
    );
  typia.assert(lowRatingPage);
  for (const review of lowRatingPage.data)
    TestValidator.predicate(
      "rating between 1 and 2",
      () => review.rating >= 1 && review.rating <= 2,
    );
  // 4. Test search with no-match keyword returns empty page
  const noMatchPage = await api.functional.eCommerceMall.customer.reviews.index(
    customerConnection,
    {
      body: {
        search: RandomGenerator.alphaNumeric(32),
      } satisfies IECommerceMallReview.IRequest,
    },
  );
  typia.assert(noMatchPage);
  TestValidator.equals("empty data", noMatchPage.data, []);
  TestValidator.equals("zero records", noMatchPage.pagination.records, 0);
  // 5. Test with no filters (returns all non-deleted reviews)
  const allReviewsPage =
    await api.functional.eCommerceMall.customer.reviews.index(
      customerConnection,
      {
        body: {} satisfies IECommerceMallReview.IRequest,
      },
    );
  typia.assert(allReviewsPage);
}
