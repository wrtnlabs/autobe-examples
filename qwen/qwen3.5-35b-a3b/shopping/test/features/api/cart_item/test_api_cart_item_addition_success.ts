import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShoppingCart";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_carts_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_carts_items_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";

export async function test_api_cart_item_addition_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email">
      >() satisfies string as string &
        tags.Format<"email"> &
        tags.MinLength<1> &
        tags.MaxLength<255>,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>() satisfies string,
      referrer: typia.random<string & tags.Format<"uri">>() satisfies string,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Create shopping cart
  const cart =
    await api.functional.ecommerceMall.customer.carts.create(
      customerConnection,
    );
  typia.assert(cart);
  const cartCreatedAt = cart.updated_at;
  // 3. Get product variants to add to cart
  const productId = typia.random<string & tags.Format<"uuid">>();
  const variantsResponse =
    await api.functional.ecommerceMall.products.variants.index(
      customerConnection,
      {
        productId,
        body: {
          is_active: true,
          stock_quantity: 1,
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(variantsResponse);
  // Select an active variant with sufficient stock
  const availableVariants = variantsResponse.data.filter(
    (v) => v.isActive && v.stockQuantity >= 1,
  );
  TestValidator.predicate(
    "has available variant to add to cart",
    availableVariants.length > 0,
  );
  const selectedVariant = availableVariants[0];
  typia.assert(selectedVariant);
  // 4. Add variant to cart
  const quantity = 2 satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<10>;
  const cartItem =
    await generate_random_ecommerce_mall_customer_carts_items_create(
      customerConnection,
      {
        params: { cartId: cart.id },
        body: {
          variant_id: selectedVariant.id,
          quantity,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // 5. Validate cart item creation
  TestValidator.equals(
    "variant_id matches selected variant",
    cartItem.variant.id,
    selectedVariant.id,
  );
  TestValidator.equals("quantity matches input", cartItem.quantity, quantity);
  TestValidator.equals(
    "price matches variant price",
    cartItem.price,
    selectedVariant.priceOverride ?? selectedVariant.product.basePrice,
  );
  TestValidator.equals("cart_id matches cart", cartItem.cart.id, cart.id);
  TestValidator.equals(
    "customer_id matches authenticated customer",
    cartItem.cart.customerId,
    customerAuth.id,
  );
  TestValidator.equals(
    "variant sku_code matches",
    cartItem.variant.skuCode,
    selectedVariant.skuCode,
  );
  TestValidator.equals(
    "variant stockQuantity matches",
    cartItem.variant.stockQuantity,
    selectedVariant.stockQuantity,
  );
  TestValidator.equals(
    "variant is_active matches",
    cartItem.variant.isActive,
    selectedVariant.isActive,
  );
  TestValidator.equals(
    "variant optionValues matches",
    cartItem.variant.optionValues,
    selectedVariant.optionValues,
  );
  // 6. Verify cart updatedAt is updated after adding item
  TestValidator.notEquals(
    "cart updatedAt is updated after adding item",
    cartCreatedAt,
    cartItem.cart.updatedAt,
  );
  // 7. Verify cart has items
  TestValidator.equals("cart item count is 1", cartItem.cart.itemCount, 1);
  // 8. Verify cart totals are recalculated
  TestValidator.predicate(
    "cart subtotal is positive",
    cartItem.cart.subtotal > 0,
  );
  TestValidator.predicate("cart total is positive", cartItem.cart.total > 0);
  TestValidator.predicate("cart tax is non-negative", cartItem.cart.tax >= 0);
}
