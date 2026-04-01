import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCartItem";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
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
import { generate_random_mall_platform_customer_carts_items_post_by_cartid } from "../../../generate/generate_random_mall_platform_customer_carts_items_post_by_cartid";
import { generate_random_mall_platform_seller_products_variants_create } from "../../../generate/generate_random_mall_platform_seller_products_variants_create";
import { prepare_random_mall_platform_cart_item } from "../../../prepare/prepare_random_mall_platform_cart_item";
import { prepare_random_mall_platform_product_variant } from "../../../prepare/prepare_random_mall_platform_product_variant";

export async function test_api_cart_item_merge_duplicate_variant_quantity(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const sellerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  const cart =
    await api.functional.mallPlatform.customer.carts.create(customerConnection);
  typia.assert(cart);
  const productId = typia.random<string & tags.Format<"uuid">>();
  const variant =
    await generate_random_mall_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId },
        body: {
          skuCode: RandomGenerator.alphaNumeric(12),
          optionValues: RandomGenerator.name(),
          priceOverride: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1>
          >(),
        } satisfies IMallPlatformProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  const firstQuantity = 1;
  const secondQuantity = 2;
  const variantId = (variant as IMallPlatformProductVariant & { id: string }).id;
  const firstItem =
    await generate_random_mall_platform_customer_carts_items_post_by_cartid(
      customerConnection,
      {
        params: { cartId: cart.id },
        body: {
          mall_platform_product_variant_id: variantId,
          quantity: firstQuantity,
        } satisfies IMallPlatformCartItem.ICreate,
      },
    );
  typia.assert(firstItem);
  const secondItem =
    await generate_random_mall_platform_customer_carts_items_post_by_cartid(
      customerConnection,
      {
        params: { cartId: cart.id },
        body: {
          mall_platform_product_variant_id: firstItem.productVariant.id,
          quantity: secondQuantity,
        } satisfies IMallPlatformCartItem.ICreate,
      },
    );
  typia.assert(secondItem);
  TestValidator.equals(
    "cart item should merge into one line",
    firstItem.id,
    secondItem.id,
  );
  TestValidator.equals(
    "merged quantity should equal combined quantity",
    secondItem.quantity,
    firstQuantity + secondQuantity,
  );
  TestValidator.equals(
    "variant should remain the same after merge",
    secondItem.productVariant.id,
    firstItem.productVariant.id,
  );
  TestValidator.equals(
    "shopping cart should remain the same after merge",
    secondItem.shoppingCart.id,
    cart.id,
  );
  TestValidator.predicate(
    "cart item should still be active",
    secondItem.deletedAt === null,
  );
}
