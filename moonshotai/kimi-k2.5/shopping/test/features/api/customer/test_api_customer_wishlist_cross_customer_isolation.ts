import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallWishlistItem";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_wishlist_create } from "../../../generate/generate_random_ecommerce_mall_customer_wishlist_create";
import { prepare_random_ecommerce_mall_wishlist_item } from "../../../prepare/prepare_random_ecommerce_mall_wishlist_item";

/**
 * Verify wishlist retrieval respects cross-customer access blocking and only returns authenticated customer's items.
 *
 * Test Steps:
 * 1. Register and authenticate Customer A
 * 2. Add specific products to Customer A's wishlist and record product IDs
 * 3. Register and authenticate Customer B (separate session)
 * 4. Add different products to Customer B's wishlist
 * 5. Using Customer A's session, retrieve wishlist
 * 6. Verify only Customer A's wishlist items are returned
 * 7. Verify Customer B's wishlist items are NOT visible in the response
 * 8. Using Customer B's session, retrieve wishlist and verify only Customer B's items are returned
 * 9. Verify product IDs in responses match what was added by each respective customer
 */
export async function test_api_customer_wishlist_cross_customer_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate Customer A
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerA);
  // 2. Add products to Customer A's wishlist and record product IDs
  const wishlistItemA1 =
    await generate_random_ecommerce_mall_customer_wishlist_create(
      customerAConnection,
      { body: {} },
    );
  typia.assert(wishlistItemA1);
  const wishlistItemA2 =
    await generate_random_ecommerce_mall_customer_wishlist_create(
      customerAConnection,
      { body: {} },
    );
  typia.assert(wishlistItemA2);
  // 3. Register and authenticate Customer B
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerB);
  // 4. Add different products to Customer B's wishlist
  const wishlistItemB1 =
    await generate_random_ecommerce_mall_customer_wishlist_create(
      customerBConnection,
      { body: {} },
    );
  typia.assert(wishlistItemB1);
  const wishlistItemB2 =
    await generate_random_ecommerce_mall_customer_wishlist_create(
      customerBConnection,
      { body: {} },
    );
  typia.assert(wishlistItemB2);
  // 5. Retrieve Customer A's wishlist using Customer A's session
  const wishlistA = await api.functional.ecommerceMall.customer.wishlist.index(
    customerAConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallWishlistItem.IRequest,
    },
  );
  typia.assert(wishlistA);
  // 6. Verify only Customer A's items are returned
  const productIdsInAResponse = wishlistA.data.map((item) => item.product.id);
  TestValidator.equals(
    "Customer A's wishlist should contain their first item",
    productIdsInAResponse.includes(wishlistItemA1.product.id),
    true,
  );
  TestValidator.equals(
    "Customer A's wishlist should contain their second item",
    productIdsInAResponse.includes(wishlistItemA2.product.id),
    true,
  );
  // 7. Verify Customer B's items are NOT visible in Customer A's response
  TestValidator.equals(
    "Customer A should not see Customer B's first item",
    productIdsInAResponse.includes(wishlistItemB1.product.id),
    false,
  );
  TestValidator.equals(
    "Customer A should not see Customer B's second item",
    productIdsInAResponse.includes(wishlistItemB2.product.id),
    false,
  );
  // 8. Retrieve Customer B's wishlist using Customer B's session
  const wishlistB = await api.functional.ecommerceMall.customer.wishlist.index(
    customerBConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallWishlistItem.IRequest,
    },
  );
  typia.assert(wishlistB);
  // 9. Verify only Customer B's items are returned
  const productIdsInBResponse = wishlistB.data.map((item) => item.product.id);
  TestValidator.equals(
    "Customer B's wishlist should contain their first item",
    productIdsInBResponse.includes(wishlistItemB1.product.id),
    true,
  );
  TestValidator.equals(
    "Customer B's wishlist should contain their second item",
    productIdsInBResponse.includes(wishlistItemB2.product.id),
    true,
  );
  // 10. Verify Customer A's items are NOT visible in Customer B's response
  TestValidator.equals(
    "Customer B should not see Customer A's first item",
    productIdsInBResponse.includes(wishlistItemA1.product.id),
    false,
  );
  TestValidator.equals(
    "Customer B should not see Customer A's second item",
    productIdsInBResponse.includes(wishlistItemA2.product.id),
    false,
  );
  // 11. Verify counts match expected
  TestValidator.equals(
    "Customer A should have exactly 2 wishlist items",
    wishlistA.data.length,
    2,
  );
  TestValidator.equals(
    "Customer B should have exactly 2 wishlist items",
    wishlistB.data.length,
    2,
  );
}
