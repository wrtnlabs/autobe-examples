import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_reviews_create";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";

export async function test_api_review_create_duplicate_same_order_rejected(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authorized);
  const reviewBody = {
    shopping_mall_product_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_order_item_id: typia.random<string & tags.Format<"uuid">>(),
    rating: 5 satisfies number as number & tags.Type<"int32">,
    content: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallReview.ICreate;
  const first = await generate_random_shopping_mall_customer_reviews_create(
    customerConnection,
    {
      body: reviewBody,
    },
  );
  typia.assert(first);
  TestValidator.equals(
    "review product matches requested product",
    first.product.id,
    reviewBody.shopping_mall_product_id,
  );
  TestValidator.equals(
    "review order matches requested order",
    first.order.id,
    reviewBody.shopping_mall_order_id,
  );
  TestValidator.equals(
    "review order item matches requested order item",
    first.orderItem.id,
    reviewBody.shopping_mall_order_item_id,
  );
  TestValidator.equals(
    "review rating matches request",
    first.rating,
    reviewBody.rating,
  );
  TestValidator.equals(
    "review content matches request",
    first.content,
    reviewBody.content,
  );
  TestValidator.equals("review remains active", first.deleted_at, null);
  TestValidator.equals(
    "review author matches customer",
    first.customer.id,
    authorized.id,
  );
  await TestValidator.error(
    "duplicate review creation for same order context is rejected",
    async () => {
      await generate_random_shopping_mall_customer_reviews_create(
        customerConnection,
        {
          body: reviewBody,
        },
      );
    },
  );
}
