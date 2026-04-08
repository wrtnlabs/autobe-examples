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
 * Verifies that only the owning seller can update a product variant.
 *
 * This test authenticates two independent sellers, prepares a valid product and variant for each seller, and then attempts to update the second seller's variant from the first seller's account.
 *
 * The scenario validates the access-control boundary for seller-owned variant edits and confirms that the unauthorized update is rejected without altering the target variant's captured state.
 *
 * 1. Register and authenticate the acting seller.
 * 2. Create the acting seller's own product and variant as baseline control data.
 * 3. Register and authenticate a different seller.
 * 4. Create the target seller's product and variant.
 * 5. Attempt to update the other seller's variant using the acting seller's connection.
 * 6. Confirm the request is rejected and the captured target variant state remains unchanged.
 */
export async function test_api_product_variant_update_owner_only_access_control(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const targetConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(ownerConnection, {
    body: {
      email: `owner-${RandomGenerator.alphaNumeric(10)}@example.com`,
      password: `Owner-${RandomGenerator.alphaNumeric(12)}!`,
    } satisfies IMallPlatformSeller.IJoin,
  });
  const ownerProduct =
    await generate_random_mall_platform_seller_products_create(
      ownerConnection,
      {
        body: {
          name: `Owner Product ${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          categoryId: null,
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1>
          >(),
        },
      },
    );
  typia.assert(ownerProduct);
  const ownerVariant =
    await generate_random_mall_platform_seller_products_variants_create(
      ownerConnection,
      {
        params: { productId: ownerProduct.id },
        body: {
          skuCode: `OWN-${RandomGenerator.alphaNumeric(10)}`,
          optionValues: `size:${RandomGenerator.alphabets(3)}`,
          priceOverride: null,
        } satisfies IMallPlatformProductVariant.ICreate,
      },
    );
  typia.assert(ownerVariant);
  await authorize_seller_join(targetConnection, {
    body: {
      email: `target-${RandomGenerator.alphaNumeric(10)}@example.com`,
      password: `Target-${RandomGenerator.alphaNumeric(12)}!`,
    } satisfies IMallPlatformSeller.IJoin,
  });
  const targetProduct =
    await generate_random_mall_platform_seller_products_create(
      targetConnection,
      {
        body: {
          name: `Target Product ${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          categoryId: null,
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1>
          >(),
        },
      },
    );
  typia.assert(targetProduct);
  const targetVariant =
    await generate_random_mall_platform_seller_products_variants_create(
      targetConnection,
      {
        params: { productId: targetProduct.id },
        body: {
          skuCode: `TGT-${RandomGenerator.alphaNumeric(10)}`,
          optionValues: `color:${RandomGenerator.alphabets(4)}`,
          priceOverride: null,
        } satisfies IMallPlatformProductVariant.ICreate,
      },
    );
  typia.assert(targetVariant);
  const originalTargetVariant: IMallPlatformProductVariant = {
    ...targetVariant,
    product: targetVariant.product,
  };
  const updateBody = {
    skuCode: `HACK-${RandomGenerator.alphaNumeric(10)}`,
    optionValues: `color:${RandomGenerator.alphabets(5)}`,
    priceOverride:
      targetVariant.priceOverride === null
        ? ownerProduct.basePrice + 100
        : targetVariant.priceOverride + 100,
    isActive: !targetVariant.isActive,
  } satisfies IMallPlatformProductVariant.IUpdate;
  await TestValidator.error(
    "unauthorized seller cannot update another seller's variant",
    async () => {
      await api.functional.mallPlatform.seller.products.variants.update(
        ownerConnection,
        {
          productId: targetProduct.id,
          variantId: targetVariant.id,
          body: updateBody,
        },
      );
    },
  );
  TestValidator.equals(
    "target variant SKU remains unchanged",
    targetVariant.skuCode,
    originalTargetVariant.skuCode,
  );
  TestValidator.equals(
    "target variant option values remain unchanged",
    targetVariant.optionValues,
    originalTargetVariant.optionValues,
  );
  TestValidator.equals(
    "target variant price override remains unchanged",
    targetVariant.priceOverride,
    originalTargetVariant.priceOverride,
  );
  TestValidator.equals(
    "target variant active state remains unchanged",
    targetVariant.isActive,
    originalTargetVariant.isActive,
  );
  TestValidator.equals(
    "target variant belongs to the target product",
    targetVariant.product.id,
    targetProduct.id,
  );
  TestValidator.equals(
    "target variant identity remains unchanged",
    targetVariant.id,
    originalTargetVariant.id,
  );
}
