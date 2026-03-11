import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
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

export async function test_api_customer_review_list_own(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.assert<string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>>(typia.random<string & tags.Format<"email">>()),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>() satisfies string,
      referrer: typia.random<string & tags.Format<"uri">>() satisfies string,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(authorized);
  // 2. Create a review using SDK directly
  const review = await api.functional.ecommerceMall.customer.reviews.create(
    customerConnection,
    {
      body: {
        rating: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
        product_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceMallReview.ICreate,
    },
  );
  typia.assert(review);
  // 3. List own reviews (no customerId filter = defaults to authenticated user)
  const response = await api.functional.ecommerceMall.customer.reviews.index(
    customerConnection,
    {
      body: {} satisfies IEcommerceMallReview.IRequest,
    },
  );
  typia.assert(response);
  // 4. Validate response structure
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 20);
  TestValidator.predicate("has records", response.pagination.records >= 1);
  TestValidator.predicate("has pages", response.pagination.pages >= 1);
  TestValidator.predicate("has data array", response.data.length >= 1);
  // 5. Validate each review structure
  for (const r of response.data) {
    typia.assert(r);
    TestValidator.predicate("rating valid", r.rating >= 1 && r.rating <= 5);
    TestValidator.equals("is active true", r.is_active, true);
    TestValidator.equals("deleted at null", r.deleted_at, null);
    TestValidator.notEquals("created at valid", r.created_at, undefined);
    TestValidator.notEquals("updated at valid", r.updated_at, undefined);
    TestValidator.notEquals(
      "customer display name valid",
      r.customer.display_name,
      undefined,
    );
    TestValidator.notEquals("product name valid", r.product.name, undefined);
  }
  // 6. Verify reviews are sorted by newest first (descending createdAt)
  if (response.data.length > 1) {
    for (let i = 1; i < response.data.length; i++) {
      const prevDate = new Date(response.data[i - 1].created_at);
      const currDate = new Date(response.data[i].created_at);
      TestValidator.predicate(
        `review ${i} created before or same as review ${i - 1}`,
        currDate <= prevDate,
      );
    }
  }
}