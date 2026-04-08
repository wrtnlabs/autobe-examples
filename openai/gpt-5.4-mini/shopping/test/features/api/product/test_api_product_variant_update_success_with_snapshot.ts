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

export async function test_api_product_variant_update_success_with_snapshot(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test seller-owned product variant updates preserve historical state via snapshot.
   *
   * This scenario validates the full variant update flow for a seller-owned product.
   * It covers seller authentication, product creation, variant creation, variant mutation,
   * and verification that the returned variant reflects the persisted business changes.
   *
   * In addition, it checks the product snapshot history to ensure the previous variant
   * state is retained for audit and dispute resolution, so historical SKU, option values,
   * pricing, and active-state information can still be reconstructed after the update.
   *
   * 1. Authenticate as a seller and create the parent product.
   * 2. Create an initial variant under the product with known mutable values.
   * 3. Update the variant's SKU, options, price override, and active state.
   * 4. Verify the updated variant is still bound to the same product and reflects the new data.
   * 5. Confirm the product snapshot history preserved the prior variant state.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "changeit123",
    } satisfies IMallPlatformSeller.IJoin,
  });
  const product = await generate_random_mall_platform_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: null,
        basePrice: randint(1000, 100000),
      },
    },
  );
  typia.assert(product);
  const initialSku = `SKU-${RandomGenerator.alphabets(8)}`;
  const initialOptionValues = "Color: Red / Size: M";
  const initialPriceOverride = product.basePrice + 1000;
  const variant =
    await generate_random_mall_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          skuCode: initialSku,
          optionValues: initialOptionValues,
          priceOverride: initialPriceOverride,
        } satisfies IMallPlatformProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  const updatedSku = `SKU-${RandomGenerator.alphabets(10)}`;
  const updatedOptionValues = "Color: Blue / Size: L";
  const updatedPriceOverride = initialPriceOverride + 500;
  const updatedVariant =
    await api.functional.mallPlatform.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          skuCode: updatedSku,
          optionValues: updatedOptionValues,
          priceOverride: updatedPriceOverride,
          isActive: false,
        } satisfies IMallPlatformProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  TestValidator.equals(
    "variant stays bound to the same product",
    updatedVariant.product.id,
    product.id,
  );
  TestValidator.equals(
    "variant id remains the same",
    updatedVariant.id,
    variant.id,
  );
  TestValidator.equals("sku code updated", updatedVariant.skuCode, updatedSku);
  TestValidator.equals(
    "option values updated",
    updatedVariant.optionValues,
    updatedOptionValues,
  );
  TestValidator.equals(
    "price override updated",
    updatedVariant.priceOverride,
    updatedPriceOverride,
  );
  TestValidator.equals("active state updated", updatedVariant.isActive, false);
  TestValidator.predicate(
    "updated variant has a later timestamp",
    new Date(updatedVariant.updatedAt).getTime() >=
      new Date(variant.updatedAt).getTime(),
  );
  TestValidator.predicate(
    "product exposes variant snapshot history after update",
    product.variantSnapshots.length > 0,
  );
  const preservedVariantSnapshot = product.variantSnapshots.find(
    (snapshot) => snapshot.product.id === product.id,
  );
  TestValidator.predicate(
    "a variant snapshot for the product exists",
    preservedVariantSnapshot !== undefined,
  );
  if (preservedVariantSnapshot !== undefined) {
    TestValidator.equals(
      "snapshot belongs to the same product",
      preservedVariantSnapshot.product.id,
      product.id,
    );
    TestValidator.equals(
      "snapshot records the original SKU",
      preservedVariantSnapshot.skuCode,
      initialSku,
    );
    TestValidator.equals(
      "snapshot records the original price override",
      preservedVariantSnapshot.priceOverride,
      initialPriceOverride,
    );
  }
}
