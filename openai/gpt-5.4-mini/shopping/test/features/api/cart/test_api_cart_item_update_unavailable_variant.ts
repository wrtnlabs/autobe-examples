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

export async function test_api_cart_item_update_unavailable_variant(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const sellerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = `${RandomGenerator.alphaNumeric(10)}Aa1!`;
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://example.com/register",
      referrer: "https://example.com/home",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = `${RandomGenerator.alphaNumeric(10)}Aa1!`;
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IMallPlatformSeller.IJoin,
  });
  const product = await generate_random_mall_platform_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        basePrice: 10000,
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
          optionValues: "Color: Red / Size: M",
          priceOverride: null,
        } satisfies IMallPlatformProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  const cartId = typia.random<string & tags.Format<"uuid">>();
  const cartItem =
    await generate_random_mall_platform_customer_carts_items_create(
      customerConnection,
      {
        params: { cartId },
        body: {
          productVariantId: variant.id,
          quantity: 1,
        } satisfies IMallPlatformCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  const beforeUpdateVariantId = cartItem.productVariant.id;
  const beforeUpdateQuantity = cartItem.quantity;
  await TestValidator.error(
    "cart item update should fail or remain tied to the original unavailable variant",
    async () => {
      const updated =
        await api.functional.mallPlatform.customer.carts.items.update(
          customerConnection,
          {
            cartId,
            cartItemId: cartItem.id,
            body: {
              quantity: beforeUpdateQuantity + 1,
            } satisfies IMallPlatformCartItem.IUpdate,
          },
        );
      typia.assert(updated);
      TestValidator.equals(
        "cart item must remain attached to the original variant",
        updated.productVariant.id,
        beforeUpdateVariantId,
      );
      TestValidator.notEquals(
        "cart item update must not silently move to a different variant",
        updated.productVariant.id,
        typia.random<string & tags.Format<"uuid">>(),
      );
    },
  );
}
