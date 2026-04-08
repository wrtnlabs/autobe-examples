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

/**
 * Verify that SKU codes are enforced as globally unique across product variants.
 *
 * This scenario covers seller authentication, product creation, successful variant creation,
 * and rejection of a duplicate SKU code on a subsequent variant create request. It validates
 * that the original variant remains intact after the conflict and that SKU uniqueness is
 * enforced at the catalog level.
 *
 * 1. Authenticate a fresh seller connection.
 * 2. Create a product owned by that seller.
 * 3. Create the first variant with a fixed SKU code.
 * 4. Attempt to create a second variant using the same SKU code.
 * 5. Confirm the duplicate request fails and the original variant data remains unchanged.
 */
export async function test_api_product_variant_create_duplicate_sku_code(
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
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >() satisfies number as number,
      } satisfies IMallPlatformProduct.ICreate,
    },
  );
  typia.assert(product);
  const skuCode = `SKU-${RandomGenerator.alphaNumeric(12)}`;
  const firstVariantInput = {
    skuCode,
    optionValues: "color:red,size:large",
    priceOverride: product.basePrice + 1000,
  } satisfies IMallPlatformProductVariant.ICreate;
  const firstVariant =
    await api.functional.mallPlatform.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: firstVariantInput,
      },
    );
  typia.assert(firstVariant);
  TestValidator.equals("first variant sku code", firstVariant.skuCode, skuCode);
  TestValidator.equals(
    "first variant option values",
    firstVariant.optionValues,
    firstVariantInput.optionValues,
  );
  TestValidator.equals(
    "first variant price override",
    firstVariant.priceOverride,
    firstVariantInput.priceOverride,
  );
  TestValidator.equals(
    "first variant product id",
    firstVariant.product.id,
    product.id,
  );
  await TestValidator.error("duplicate sku code must be rejected", async () => {
    await api.functional.mallPlatform.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          skuCode,
          optionValues: "color:blue,size:small",
          priceOverride: product.basePrice + 2000,
        } satisfies IMallPlatformProductVariant.ICreate,
      },
    );
  });
  TestValidator.equals(
    "original variant sku remains unchanged",
    firstVariant.skuCode,
    skuCode,
  );
  TestValidator.equals(
    "original variant option values remain unchanged",
    firstVariant.optionValues,
    firstVariantInput.optionValues,
  );
  TestValidator.equals(
    "original variant price remains unchanged",
    firstVariant.priceOverride,
    firstVariantInput.priceOverride,
  );
}
