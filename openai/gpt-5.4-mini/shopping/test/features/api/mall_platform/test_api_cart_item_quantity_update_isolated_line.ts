import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCartItem";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCart";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_customer_carts_items_create } from "../../../generate/generate_random_mall_platform_customer_carts_items_create";
import { generate_random_mall_platform_seller_products_create } from "../../../generate/generate_random_mall_platform_seller_products_create";
import { generate_random_mall_platform_seller_products_variants_create } from "../../../generate/generate_random_mall_platform_seller_products_variants_create";
import { prepare_random_mall_platform_cart_item } from "../../../prepare/prepare_random_mall_platform_cart_item";
import { prepare_random_mall_platform_product } from "../../../prepare/prepare_random_mall_platform_product";
import { prepare_random_mall_platform_product_variant } from "../../../prepare/prepare_random_mall_platform_product_variant";

/**
 * Verify isolated cart-item quantity updates within a cart containing multiple variant lines.
 *
 * This scenario validates that changing one cart line only updates that line while leaving the rest of the cart intact. It also confirms the cart merge rule for duplicate variant additions by asserting that adding the same variant again updates the existing line instead of creating a second one.
 *
 * 1. Create and authenticate a seller, then create a product with two variants.
 * 2. Create and authenticate a customer, then add the first variant to establish the cart.
 * 3. Add the same first variant again and confirm the cart item id is unchanged while quantity increases.
 * 4. Add a second variant as a separate cart line.
 * 5. Update only the first cart item quantity and confirm the second line remains unchanged.
 */
export async function test_api_cart_item_quantity_update_isolated_line(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: typia.assert<IMallPlatformCustomer.IJoin>({
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } as IMallPlatformCustomer.IJoin),
  });
  const product = await generate_random_mall_platform_seller_products_create(
    sellerConnection,
    {
      body: {
        name: `Cart update isolation ${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        basePrice: 10000,
      } satisfies IMallPlatformProduct.ICreate,
    },
  );
  typia.assert(product);
  const firstVariant =
    await generate_random_mall_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(10)}`,
          optionValues: "Color: Red / Size: M",
          priceOverride: 11000,
        } satisfies IMallPlatformProductVariant.ICreate,
      },
    );
  typia.assert(firstVariant);
  const secondVariant =
    await generate_random_mall_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(10)}`,
          optionValues: "Color: Blue / Size: L",
          priceOverride: 12000,
        } satisfies IMallPlatformProductVariant.ICreate,
      },
    );
  typia.assert(secondVariant);
  const firstLine =
    await generate_random_mall_platform_customer_carts_items_create(
      customerConnection,
      {
        params: {
          cartId: typia.random<string & tags.Format<"uuid">>(),
        },
        body: {
          productVariantId: firstVariant.id,
          quantity: 1,
        } satisfies IMallPlatformCartItem.ICreate,
      },
    );
  typia.assert(firstLine);
  const mergedFirstLine =
    await api.functional.mallPlatform.customer.carts.items.create(
      customerConnection,
      {
        cartId: firstLine.shoppingCart.id,
        body: {
          productVariantId: firstVariant.id,
          quantity: 2,
        } satisfies IMallPlatformCartItem.ICreate,
      },
    );
  typia.assert(mergedFirstLine);
  TestValidator.equals(
    "duplicate variant additions should merge into the same cart line",
    mergedFirstLine.id,
    firstLine.id,
  );
  TestValidator.equals(
    "merged quantity should increase on the existing cart line",
    mergedFirstLine.quantity,
    firstLine.quantity + 2,
  );
  TestValidator.equals(
    "merged cart line should still reference the first variant",
    mergedFirstLine.productVariant.id,
    firstVariant.id,
  );
  const secondLine =
    await api.functional.mallPlatform.customer.carts.items.create(
      customerConnection,
      {
        cartId: firstLine.shoppingCart.id,
        body: {
          productVariantId: secondVariant.id,
          quantity: 3,
        } satisfies IMallPlatformCartItem.ICreate,
      },
    );
  typia.assert(secondLine);
  TestValidator.notEquals(
    "different variants should occupy different cart lines",
    mergedFirstLine.id,
    secondLine.id,
  );
  TestValidator.notEquals(
    "different variants should remain isolated by product variant",
    mergedFirstLine.productVariant.id,
    secondLine.productVariant.id,
  );
  const updatedFirstLine =
    await api.functional.mallPlatform.customer.carts.items.update(
      customerConnection,
      {
        cartId: firstLine.shoppingCart.id,
        cartItemId: firstLine.id,
        body: {
          quantity: 5,
        } satisfies IMallPlatformCartItem.IUpdate,
      },
    );
  typia.assert(updatedFirstLine);
  TestValidator.equals(
    "updated cart item id should remain the same",
    updatedFirstLine.id,
    firstLine.id,
  );
  TestValidator.equals(
    "updated cart item should stay on the same cart",
    updatedFirstLine.shoppingCart.id,
    firstLine.shoppingCart.id,
  );
  TestValidator.equals(
    "updated cart item should stay on the same variant",
    updatedFirstLine.productVariant.id,
    firstVariant.id,
  );
  TestValidator.equals(
    "updated cart item quantity should change to the requested value",
    updatedFirstLine.quantity,
    5,
  );
  TestValidator.equals(
    "second cart item id should remain stable",
    secondLine.id,
    secondLine.id,
  );
  TestValidator.equals(
    "second cart item quantity should remain unchanged",
    secondLine.quantity,
    3,
  );
  TestValidator.equals(
    "second cart item should still reference the second variant",
    secondLine.productVariant.id,
    secondVariant.id,
  );
  TestValidator.notEquals(
    "updated first line and second line must remain distinct",
    updatedFirstLine.id,
    secondLine.id,
  );
  TestValidator.notEquals(
    "updated first line and second line must remain tied to different variants",
    updatedFirstLine.productVariant.id,
    secondLine.productVariant.id,
  );
}
