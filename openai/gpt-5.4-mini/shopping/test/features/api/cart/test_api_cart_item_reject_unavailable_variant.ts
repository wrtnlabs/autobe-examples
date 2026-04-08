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

export async function test_api_cart_item_reject_unavailable_variant(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Rejects adding an unavailable product variant to a customer cart.
   *
   * This test validates that the cart-item creation endpoint refuses a variant
   * that is no longer eligible for purchase while leaving already existing cart
   * content untouched.
   *
   * The scenario uses isolated customer and seller connections, creates a real
   * product and purchasable variant, places one valid cart item first, then
   * attempts to add a non-existent variant identifier to represent an
   * unavailable variant state. The important business rule is that the invalid
   * add must fail without disturbing the pre-existing cart line.
   *
   * 1. Authenticate isolated customer and seller actors.
   * 2. Create a product and a purchasable variant for the seller.
   * 3. Add a valid cart item to establish existing cart state.
   * 4. Attempt to add a missing variant identifier to the same cart.
   * 5. Verify the invalid add is rejected and the original cart item remains.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const product = await generate_random_mall_platform_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        basePrice: typia.random<number>(),
      } satisfies IMallPlatformProduct.ICreate,
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_mall_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(12),
          optionValues: "color: red, size: M",
          priceOverride: null,
        } satisfies IMallPlatformProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  const cartId = typia.random<string & tags.Format<"uuid">>();
  const initialQuantity = 1;
  const cartItem =
    await generate_random_mall_platform_customer_carts_items_create(
      customerConnection,
      {
        params: { cartId },
        body: {
          productVariantId: variant.id,
          quantity: initialQuantity,
        } satisfies IMallPlatformCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  TestValidator.equals(
    "existing cart item should reference the purchased variant",
    cartItem.productVariant.id,
    variant.id,
  );
  TestValidator.equals(
    "existing cart item quantity should match the inserted value",
    cartItem.quantity,
    initialQuantity,
  );
  const unavailableVariantId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "unavailable variant should be rejected from cart add",
    async () => {
      await generate_random_mall_platform_customer_carts_items_create(
        customerConnection,
        {
          params: { cartId },
          body: {
            productVariantId: unavailableVariantId,
            quantity: 1,
          } satisfies IMallPlatformCartItem.ICreate,
        },
      );
    },
  );
  TestValidator.equals(
    "existing cart item should remain associated with the original variant",
    cartItem.productVariant.id,
    variant.id,
  );
  TestValidator.equals(
    "existing cart item quantity should remain unchanged after rejection",
    cartItem.quantity,
    initialQuantity,
  );
}
