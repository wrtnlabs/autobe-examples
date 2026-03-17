import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_customer_review_deletion_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Customer A (will attempt unauthorized deletion)
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerA);
  // 2. Create Customer B (review owner)
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerB);
  // 3. Customer B creates a review
  const product: IEcommerceMallProduct.ISummary =
    typia.random<IEcommerceMallProduct.ISummary>();
  const order: IEcommerceMallOrder.ISummary =
    typia.random<IEcommerceMallOrder.ISummary>();
  const review = await api.functional.ecommerceMall.customer.reviews.create(
    customerBConnection,
    {
      body: {
        rating: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        body: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 5,
          wordMax: 10,
        }),
        product_id: product.id,
        order_id: order.id,
      } satisfies IEcommerceMallReview.ICreate,
    },
  );
  typia.assert(review);
  TestValidator.equals(
    "new review should have deleted_at null",
    review.deleted_at,
    null,
  );
  // 4. Customer A attempts to delete Customer B's review (should fail with 403)
  await TestValidator.httpError(
    "customer A should not be able to delete customer B's review",
    403,
    async () => {
      await api.functional.ecommerceMall.customer.reviews.erase(
        customerAConnection,
        { reviewId: review.id },
      );
    },
  );
  // 5. Validate review still exists and is unchanged (deleted_at is null)
  TestValidator.equals(
    "review should still exist with deleted_at null after unauthorized attempt",
    review.deleted_at,
    null,
  );
  // 6. Customer B (owner) can delete their own review successfully
  await api.functional.ecommerceMall.customer.reviews.erase(
    customerBConnection,
    {
      reviewId: review.id,
    },
  );
  // 7. Validation complete - successful 204 indicates deletion performed
}