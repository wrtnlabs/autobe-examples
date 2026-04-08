import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductImageSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImageSnapshot";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotImage";
import type { IMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotVariant";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import type { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IMallPlatformWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlist";
import type { IMallPlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlistItem";
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
 * Test seller product variant creation success workflow.
 *
 * Validates that an authenticated seller can create a purchasable variant under an existing product they own. The test covers seller registration, parent product creation, and variant creation with a unique SKU code, explicit option values, and an optional price override.
 *
 * This scenario confirms the returned variant is attached to the same product, preserves the submitted catalog data, and is immediately marked active for sale so it can participate in downstream browse and cart flows.
 *
 * 1. Register and authenticate a seller using an isolated seller connection.
 * 2. Create a parent product owned by that seller.
 * 3. Create a purchasable variant under the product with a unique SKU code and explicit option values.
 * 4. Validate the response links the variant to the product and preserves the submitted fields.
 */
export async function test_api_product_variant_create_success(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const product = await generate_random_mall_platform_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: null,
        basePrice: typia.random<number & tags.Type<"int32">>(),
      },
    },
  );
  typia.assert(product);
  const skuCode = `sku-${RandomGenerator.alphaNumeric(10)}`;
  const optionValues = `color:${RandomGenerator.pick(["Red", "Blue", "Black"] as const)};size:${RandomGenerator.pick(["S", "M", "L"] as const)}`;
  const priceOverride = typia.random<number>();
  const variant =
    await generate_random_mall_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          skuCode,
          optionValues,
          priceOverride,
        } satisfies IMallPlatformProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  TestValidator.equals(
    "variant belongs to created product",
    variant.product.id,
    product.id,
  );
  TestValidator.equals(
    "variant SKU code is preserved",
    variant.skuCode,
    skuCode,
  );
  TestValidator.equals(
    "variant option values are preserved",
    variant.optionValues,
    optionValues,
  );
  TestValidator.equals(
    "variant price override is preserved",
    variant.priceOverride,
    priceOverride,
  );
  TestValidator.predicate("variant is active for sale", variant.isActive);
  TestValidator.equals(
    "variant parent product name matches",
    variant.product.name,
    product.name,
  );
  TestValidator.equals(
    "variant parent product description matches",
    variant.product.description,
    product.description,
  );
  TestValidator.equals(
    "variant parent product base price matches",
    variant.product.basePrice,
    product.basePrice,
  );
}
