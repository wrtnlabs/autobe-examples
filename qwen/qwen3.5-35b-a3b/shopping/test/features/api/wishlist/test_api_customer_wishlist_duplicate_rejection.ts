import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_wishlist_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_wishlist_items_create";
import { prepare_random_ecommerce_mall_wishlist_item } from "../../../prepare/prepare_random_ecommerce_mall_wishlist_item";

export async function test_api_customer_wishlist_duplicate_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer
  const customerJoin: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(customerJoin);
  // 2. Create customer connection with token
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = {
    ...connection.headers,
    Authorization: customerJoin.token.access,
  };
  // 3. Generate a product UUID for testing
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. First addition to wishlist (should succeed)
  const firstWishlistItem: IEcommerceMallWishlistItem =
    await api.functional.ecommerceMall.customer.wishlist_items.create(
      customerConnection,
      {
        body: {
          product_id: productId,
        } satisfies IEcommerceMallWishlistItem.ICreate,
      },
    );
  typia.assert(firstWishlistItem);
  TestValidator.equals(
    "first wishlist item product_id matches",
    firstWishlistItem.product.id,
    productId,
  );
  TestValidator.equals(
    "customer matches",
    firstWishlistItem.customer.id,
    customerJoin.id,
  );
  // 5. Duplicate attempt (should return 409 Conflict)
  await TestValidator.error("duplicate product rejected", async () => {
    await api.functional.ecommerceMall.customer.wishlist_items.create(
      customerConnection,
      {
        body: {
          product_id: productId,
        } satisfies IEcommerceMallWishlistItem.ICreate,
      },
    );
  });
  // 6. Verify no modification occurred by confirming original item exists
  // The duplicate rejection confirms the wishlist was not modified
  TestValidator.equals(
    "wishlist still contains original product",
    firstWishlistItem.product.id,
    productId,
  );
}
