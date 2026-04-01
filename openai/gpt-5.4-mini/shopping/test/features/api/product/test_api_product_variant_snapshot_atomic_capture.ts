import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_products_create } from "../../../generate/generate_random_mall_platform_seller_products_create";
import { generate_random_mall_platform_seller_products_variant_snapshots_create } from "../../../generate/generate_random_mall_platform_seller_products_variant_snapshots_create";
import { generate_random_mall_platform_seller_products_variants_create } from "../../../generate/generate_random_mall_platform_seller_products_variants_create";
import { prepare_random_mall_platform_product } from "../../../prepare/prepare_random_mall_platform_product";
import { prepare_random_mall_platform_product_variant } from "../../../prepare/prepare_random_mall_platform_product_variant";
import { prepare_random_mall_platform_product_variant_snapshot } from "../../../prepare/prepare_random_mall_platform_product_variant_snapshot";

export async function test_api_product_variant_snapshot_atomic_capture(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(12)}@test.com`,
      password: "password123!",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const sellerAuthedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: seller.token.access,
    },
  };
  const product = await generate_random_mall_platform_seller_products_create(
    sellerAuthedConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: null,
        basePrice: 10000,
      },
    },
  );
  typia.assert(product);
  const firstVariantSkuCode = `SKU-${RandomGenerator.alphaNumeric(10)}`;
  const firstVariantOptionValues = "Color: Red / Size: M";
  const firstVariant =
    await generate_random_mall_platform_seller_products_variants_create(
      sellerAuthedConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: firstVariantSkuCode,
          optionValues: firstVariantOptionValues,
          priceOverride: 12000,
        } satisfies IMallPlatformProductVariant.ICreate,
      },
    );
  typia.assert(firstVariant);
  const secondVariantSkuCode = `SKU-${RandomGenerator.alphaNumeric(10)}`;
  const secondVariantOptionValues = "Color: Blue / Size: L";
  const secondVariant =
    await generate_random_mall_platform_seller_products_variants_create(
      sellerAuthedConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: secondVariantSkuCode,
          optionValues: secondVariantOptionValues,
          priceOverride: 13000,
        } satisfies IMallPlatformProductVariant.ICreate,
      },
    );
  typia.assert(secondVariant);
  const snapshot =
    await generate_random_mall_platform_seller_products_variant_snapshots_create(
      sellerAuthedConnection,
      {
        params: { productId: product.id },
        body: {},
      },
    );
  typia.assert(snapshot);
  TestValidator.equals("snapshot product id", snapshot.product.id, product.id);
  TestValidator.equals(
    "snapshot preserves captured variant sku",
    snapshot.skuCode,
    firstVariantSkuCode,
  );
  TestValidator.equals(
    "snapshot preserves captured variant option summary",
    snapshot.optionSummary,
    firstVariantOptionValues,
  );
  const liveVariantAfterSnapshot =
    await generate_random_mall_platform_seller_products_variants_create(
      sellerAuthedConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(10)}`,
          optionValues: "Color: Green / Size: S",
          priceOverride: null,
        } satisfies IMallPlatformProductVariant.ICreate,
      },
    );
  typia.assert(liveVariantAfterSnapshot);
  TestValidator.notEquals(
    "snapshot remains immutable after later live changes",
    snapshot.skuCode,
    secondVariantSkuCode,
  );
}
