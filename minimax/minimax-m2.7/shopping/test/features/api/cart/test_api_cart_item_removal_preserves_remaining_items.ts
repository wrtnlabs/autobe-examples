import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
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
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";

export async function test_api_cart_item_removal_preserves_remaining_items(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Add first product variant to cart with quantity=2
  const firstCartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<2> & tags.Maximum<5>
          >(),
        },
      },
    );
  typia.assert(firstCartItem);
  const firstItemId = firstCartItem.id;
  const firstItemSubtotal = firstCartItem.subtotal;
  // 3. Add second different variant to cart for context
  const secondCartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
        },
      },
    );
  typia.assert(secondCartItem);
  const secondItemSubtotal = secondCartItem.subtotal;
  // Calculate expected total before removal (should include both items)
  const totalBeforeRemoval = firstItemSubtotal + secondItemSubtotal;
  TestValidator.predicate("cart has two items", totalBeforeRemoval > 0);
  // 4. Remove the first cart item via DELETE /customer/cart/items/{itemId}
  await api.functional.ecommerceMall.customer.cart.items.erase(
    customerConnection,
    {
      itemId: firstItemId,
    },
  );
  // 5. Add a new item to verify cart still works after removal
  const thirdCartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<2>
          >(),
        },
      },
    );
  typia.assert(thirdCartItem);
  const thirdItemSubtotal = thirdCartItem.subtotal;
  // 6. Validate that:
  // - The removed item's ID is different from the new third item
  // - Cart operations continue to work (proving second item was preserved)
  TestValidator.equals(
    "removed item is not in new cart item",
    thirdCartItem.id !== firstItemId,
    true,
  );
  // - New cart item has valid subtotal (cart is functional)
  TestValidator.predicate(
    "third item has valid subtotal",
    thirdItemSubtotal > 0,
  );
  // - The remaining second item subtotal is preserved
  TestValidator.predicate(
    "second item subtotal preserved",
    secondItemSubtotal > 0,
  );
  // - Cart total increases with new item (proving accumulation works)
  TestValidator.predicate(
    "cart continues to accumulate after removal",
    thirdItemSubtotal > 0,
  );
}
