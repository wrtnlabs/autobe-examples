import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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

export async function test_api_review_update_permission_denied_non_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first customer (author of the review)
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_customer_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    },
  });
  typia.assert(author);
  // 2. Create a review as the first customer (utility generates random data)
  const review =
    await generate_random_ecommerce_mall_customer_reviews_create(
      authorConnection,
    );
  typia.assert(review);
  // 3. Create second customer (non-author attempting unauthorized access)
  const nonAuthorConnection: api.IConnection = { host: connection.host };
  const nonAuthor = await authorize_customer_join(nonAuthorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    },
  });
  typia.assert(nonAuthor);
  // 4. Attempt to update the review as non-author - should fail with permission error
  await TestValidator.error(
    "non-author cannot update another's review",
    async () => {
      await api.functional.ecommerceMall.customer.reviews.update(
        nonAuthorConnection,
        {
          reviewId: review.id,
          body: {
            rating: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
            >(),
            content: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IEcommerceMallReview.IUpdate,
        },
      );
    },
  );
}
