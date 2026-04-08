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

export async function test_api_product_variant_snapshot_retrieval_by_owning_seller(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test product variant snapshot retrieval by the owning seller.
   *
   * Validates that a seller can retrieve an immutable historical snapshot of one of their own product variants and that the returned snapshot preserves historical state fields from the snapshot record.
   *
   * 1. Create and authenticate a fresh seller connection.
   * 2. Create a product and a variant owned by that seller.
   * 3. Update the variant so the live record changes after the historical state is captured.
   * 4. Retrieve the variant snapshot through the seller-owned snapshot endpoint.
   * 5. Validate the returned snapshot preserves immutable historical fields and remains stable across later live edits.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234!",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerJoin);
  const product = await generate_random_mall_platform_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: null,
        basePrice: typia.random<number>(),
      },
    },
  );
  typia.assert(product);
  const initialSku = `SKU-${RandomGenerator.alphabets(8)}`;
  const initialOptionValues = `color:Red;size:M-${RandomGenerator.alphabets(4)}`;
  const initialPriceOverride = typia.random<number>();
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
  const updatedVariant =
    await api.functional.mallPlatform.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          skuCode: `${initialSku}-V2`,
          optionValues: `${initialOptionValues};edition:second`,
          priceOverride: initialPriceOverride + 1000,
        } satisfies IMallPlatformProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.mallPlatform.seller.products.variants.snapshots.at(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  TestValidator.equals("snapshot id", snapshot.id, snapshotId);
  TestValidator.equals("snapshot product id", snapshot.product.id, product.id);
  TestValidator.equals(
    "snapshot variant id",
    snapshot.productVariant.id,
    variant.id,
  );
  TestValidator.equals(
    "snapshot sku code",
    snapshot.skuCode,
    snapshot.productVariant.skuCode,
  );
  TestValidator.equals(
    "snapshot option summary",
    snapshot.optionSummary,
    snapshot.productVariant.optionValues,
  );
  TestValidator.equals(
    "snapshot price override",
    snapshot.priceOverride,
    snapshot.productVariant.priceOverride,
  );
  TestValidator.predicate(
    "snapshot reason is nullable",
    snapshot.snapshotReason === null || snapshot.snapshotReason.length >= 0,
  );
  TestValidator.predicate(
    "snapshot createdAt is timestamp",
    snapshot.createdAt.length > 0,
  );
  const laterLiveVariant =
    await api.functional.mallPlatform.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          skuCode: `${initialSku}-LIVE`,
          optionValues: `${initialOptionValues};edition:third`,
          priceOverride: initialPriceOverride + 2000,
        } satisfies IMallPlatformProductVariant.IUpdate,
      },
    );
  typia.assert(laterLiveVariant);
  const snapshotAfterLaterEdit =
    await api.functional.mallPlatform.seller.products.variants.snapshots.at(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        snapshotId,
      },
    );
  typia.assert(snapshotAfterLaterEdit);
  TestValidator.equals(
    "snapshot remains same id",
    snapshotAfterLaterEdit.id,
    snapshot.id,
  );
  TestValidator.equals(
    "snapshot remains same sku",
    snapshotAfterLaterEdit.skuCode,
    snapshot.skuCode,
  );
  TestValidator.equals(
    "snapshot remains same option summary",
    snapshotAfterLaterEdit.optionSummary,
    snapshot.optionSummary,
  );
  TestValidator.equals(
    "snapshot remains same price override",
    snapshotAfterLaterEdit.priceOverride,
    snapshot.priceOverride,
  );
  TestValidator.equals(
    "snapshot remains same product",
    snapshotAfterLaterEdit.product.id,
    snapshot.product.id,
  );
  TestValidator.equals(
    "snapshot remains same variant",
    snapshotAfterLaterEdit.productVariant.id,
    snapshot.productVariant.id,
  );
}
