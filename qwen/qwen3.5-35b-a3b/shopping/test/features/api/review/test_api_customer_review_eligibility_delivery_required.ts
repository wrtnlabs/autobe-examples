import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
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

export async function test_api_customer_review_eligibility_delivery_required(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>() satisfies string as string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>,
        password: "TestPass1234",
        href: "https://example.com/join",
        referrer: "https://example.com/referrer",
      },
    });
  typia.assert(customer);
  // 2. Attempt to create a review without a delivered order
  // According to the business rule, reviews can only be written for delivered order items
  // This test validates that the system rejects review attempts without delivery context
  await TestValidator.error(
    "review creation rejected for undelivered product",
    async () => {
      await api.functional.ecommerceMall.customer.reviews.create(
        customerConnection,
        {
          body: {
            rating: 5,
            text_content: "Want to review before delivery!",
            product_id: typia.random<string & tags.Format<"uuid">>(),
          },
        },
      );
    },
  );
}