import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_products_create } from "../../../generate/generate_random_mall_platform_seller_products_create";
import { generate_random_mall_platform_seller_products_variants_create } from "../../../generate/generate_random_mall_platform_seller_products_variants_create";
import { prepare_random_mall_platform_product } from "../../../prepare/prepare_random_mall_platform_product";
import { prepare_random_mall_platform_product_variant } from "../../../prepare/prepare_random_mall_platform_product_variant";

export async function test_api_product_variant_create_owned_product(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const product = await api.functional.mallPlatform.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        basePrice: Math.floor(Math.random() * 10000) + 1000,
      } satisfies IMallPlatformProduct.ICreate,
    },
  );
  typia.assert(product);
  const variantBody = {
    skuCode: `sku-${RandomGenerator.alphaNumeric(12)}`,
    optionValues: `color:${RandomGenerator.pick(["Red", "Blue", "Green"] as const)};size:${RandomGenerator.pick(["S", "M", "L"] as const)}`,
    priceOverride: product.basePrice + 1000,
  } satisfies IMallPlatformProductVariant.ICreate;
  const variant =
    await api.functional.mallPlatform.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: variantBody,
      },
    );
  typia.assert(variant);
  TestValidator.equals(
    "variant links to parent product",
    variant.product.id,
    product.id,
  );
  TestValidator.equals(
    "variant sku code persists",
    variant.skuCode,
    variantBody.skuCode,
  );
  TestValidator.equals(
    "variant option values persist",
    variant.optionValues,
    variantBody.optionValues,
  );
  TestValidator.equals(
    "variant price override persists",
    variant.priceOverride,
    variantBody.priceOverride,
  );
  TestValidator.equals("variant is active", variant.isActive, true);
  TestValidator.predicate(
    "variant created at is populated",
    variant.createdAt.length > 0,
  );
  TestValidator.predicate(
    "variant updated at is populated",
    variant.updatedAt.length > 0,
  );
  TestValidator.equals("variant is not deleted", variant.deletedAt, null);
  TestValidator.equals(
    "product is still owned by seller",
    variant.product.sellerAccount.id,
    seller.id,
  );
  TestValidator.equals(
    "product name preserved",
    variant.product.name,
    product.name,
  );
}
