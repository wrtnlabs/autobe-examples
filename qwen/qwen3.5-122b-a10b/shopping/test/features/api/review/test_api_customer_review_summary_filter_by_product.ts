import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_review_summary_filter_by_product(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Generate a product ID to filter by
  const targetProductId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Request review summaries filtered by product_id
  const filteredResponse: IPageIEcommerceReview.ISummary =
    await api.functional.ecommerce.customer.reviews.summary.index(
      customerConnection,
      {
        body: {
          product_id: targetProductId,
          page: 1,
          limit: 20,
        } satisfies IEcommerceReview.IRequest,
      },
    );
  typia.assert(filteredResponse);
  // 4. Validate response structure
  TestValidator.equals(
    "pagination current page",
    filteredResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    filteredResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    filteredResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    filteredResponse.pagination.pages >= 0,
  );
  // 5. Validate all reviews in response match the filtered product_id
  for (const review of filteredResponse.data) {
    typia.assert(review);
    TestValidator.equals(
      "review product matches filter",
      review.product.id,
      targetProductId,
    );
  }
  // 6. Request unfiltered review summaries for comparison
  const unfilteredResponse: IPageIEcommerceReview.ISummary =
    await api.functional.ecommerce.customer.reviews.summary.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceReview.IRequest,
      },
    );
  typia.assert(unfilteredResponse);
  // 7. Validate unfiltered response has different (or same) record count
  // The filtered count should be less than or equal to unfiltered count
  TestValidator.predicate(
    "filtered records <= unfiltered records",
    filteredResponse.pagination.records <=
      unfilteredResponse.pagination.records,
  );
}
