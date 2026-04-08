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
 * Verify duplicate SKU creation is rejected for seller product variants.
 *
 * This test validates the platform's global SKU uniqueness rule for product variants. It creates a seller-owned product, adds an initial variant, and then attempts to create another variant with the same SKU code to ensure the duplicate request is rejected as a business conflict.
 *
 * The scenario also confirms that the original variant remains unchanged after the rejected duplicate attempt. This protects catalog identity, inventory consistency, and downstream order integrity by ensuring one SKU maps to only one variant across the platform.
 *
 * 1. Register a seller account and use an isolated seller connection.
 * 2. Create a parent product for variant management.
 * 3. Create an initial variant with a chosen SKU code and capture its stable fields.
 * 4. Attempt to create a second variant with the same SKU code and expect a conflict.
 * 5. Confirm the original variant was not modified by the failed duplicate request.
 */
export async function test_api_product_variant_duplicate_sku_conflict(
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
        description: RandomGenerator.paragraph({ sentences: 2 }),
        categoryId: null,
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
      },
    },
  );
  typia.assert(product);
  const skuCode = `SKU-${RandomGenerator.alphaNumeric(12)}`;
  const firstOptionValues = RandomGenerator.name();
  const firstVariant =
    await generate_random_mall_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          skuCode,
          optionValues: firstOptionValues,
          priceOverride: null,
        } satisfies IMallPlatformProductVariant.ICreate,
      },
    );
  typia.assert(firstVariant);
  const originalSnapshot = {
    id: firstVariant.id,
    productId: firstVariant.product.id,
    skuCode: firstVariant.skuCode,
    optionValues: firstVariant.optionValues,
    priceOverride: firstVariant.priceOverride,
    isActive: firstVariant.isActive,
    createdAt: firstVariant.createdAt,
    updatedAt: firstVariant.updatedAt,
    deletedAt: firstVariant.deletedAt,
  } as const;
  await TestValidator.error(
    "duplicate SKU code should be rejected",
    async () => {
      await generate_random_mall_platform_seller_products_variants_create(
        sellerConnection,
        {
          params: {
            productId: product.id,
          },
          body: {
            skuCode,
            optionValues: RandomGenerator.name(),
            priceOverride: null,
          } satisfies IMallPlatformProductVariant.ICreate,
        },
      );
    },
  );
  TestValidator.equals(
    "original variant id remains unchanged",
    firstVariant.id,
    originalSnapshot.id,
  );
  TestValidator.equals(
    "original variant product reference remains unchanged",
    firstVariant.product.id,
    originalSnapshot.productId,
  );
  TestValidator.equals(
    "original variant SKU remains unchanged",
    firstVariant.skuCode,
    originalSnapshot.skuCode,
  );
  TestValidator.equals(
    "original variant option values remain unchanged",
    firstVariant.optionValues,
    originalSnapshot.optionValues,
  );
  TestValidator.equals(
    "original variant price override remains unchanged",
    firstVariant.priceOverride,
    originalSnapshot.priceOverride,
  );
  TestValidator.equals(
    "original variant active state remains unchanged",
    firstVariant.isActive,
    originalSnapshot.isActive,
  );
  TestValidator.equals(
    "original variant created timestamp remains unchanged",
    firstVariant.createdAt,
    originalSnapshot.createdAt,
  );
  TestValidator.equals(
    "original variant updated timestamp remains unchanged",
    firstVariant.updatedAt,
    originalSnapshot.updatedAt,
  );
  TestValidator.equals(
    "original variant deleted timestamp remains unchanged",
    firstVariant.deletedAt,
    originalSnapshot.deletedAt,
  );
}
