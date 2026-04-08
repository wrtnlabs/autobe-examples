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

export async function test_api_cart_item_merge_same_variant_quantity(
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
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const product = await api.functional.mallPlatform.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
      } satisfies IMallPlatformProduct.ICreate,
    },
  );
  typia.assert(product);
  const variant =
    await api.functional.mallPlatform.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          skuCode: RandomGenerator.alphaNumeric(12),
          optionValues: "color=red,size=m",
          priceOverride: null,
        } satisfies IMallPlatformProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  const cartId = typia.random<string & tags.Format<"uuid">>();
  const firstQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  const secondQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  const firstItem =
    await api.functional.mallPlatform.customer.carts.items.create(
      customerConnection,
      {
        cartId,
        body: {
          productVariantId: variant.id,
          quantity: firstQuantity,
        } satisfies IMallPlatformCartItem.ICreate,
      },
    );
  typia.assert(firstItem);
  const mergedItem =
    await api.functional.mallPlatform.customer.carts.items.create(
      customerConnection,
      {
        cartId,
        body: {
          productVariantId: variant.id,
          quantity: secondQuantity,
        } satisfies IMallPlatformCartItem.ICreate,
      },
    );
  typia.assert(mergedItem);
  TestValidator.equals(
    "same cart item id is reused",
    mergedItem.id,
    firstItem.id,
  );
  TestValidator.equals(
    "quantity is merged for the same variant",
    mergedItem.quantity,
    firstItem.quantity + secondQuantity,
  );
  TestValidator.equals(
    "cart item keeps the same variant",
    mergedItem.productVariant.id,
    variant.id,
  );
  TestValidator.equals(
    "product reference stays unchanged",
    mergedItem.productVariant.product.id,
    product.id,
  );
}
