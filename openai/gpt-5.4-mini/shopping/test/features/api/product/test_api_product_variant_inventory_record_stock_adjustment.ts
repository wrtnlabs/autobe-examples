import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformInventoryRecord";
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
import { generate_random_mall_platform_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_mall_platform_seller_products_variants_inventory_records_create";
import { prepare_random_mall_platform_inventory_record } from "../../../prepare/prepare_random_mall_platform_inventory_record";
import { prepare_random_mall_platform_product } from "../../../prepare/prepare_random_mall_platform_product";
import { prepare_random_mall_platform_product_variant } from "../../../prepare/prepare_random_mall_platform_product_variant";

export async function test_api_product_variant_inventory_record_stock_adjustment(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test product variant inventory adjustment records negative stock movements.
   *
   * Validates that a seller can append a manual negative inventory movement to an owned variant and receive a proper inventory history entry linked to the same product variant. The test focuses on the append-only ledger behavior, signed quantity preservation, and the business reason recorded for the adjustment.
   *
   * Since inventory is derived from the full movement history, this scenario ensures that a negative adjustment is recorded as a new entry rather than replacing any earlier record.
   *
   * 1. Authenticate a seller with an isolated connection.
   * 2. Create a seller-owned product and a variant under that product.
   * 3. Seed an initial positive inventory record.
   * 4. Record a negative inventory adjustment and validate the resulting history entry.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = `${RandomGenerator.alphabets(8)}@test.com`;
  const sellerPassword = RandomGenerator.alphaNumeric(12);
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
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: null,
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
          skuCode: `SKU-${RandomGenerator.alphaNumeric(10)}`,
          optionValues: "color:Black,size:M",
        } satisfies IMallPlatformProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  const initialRecord =
    await generate_random_mall_platform_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          quantityChange: 12,
          reason: "initial stock in",
        } satisfies IMallPlatformInventoryRecord.ICreate,
      },
    );
  typia.assert(initialRecord);
  const adjustmentRecord =
    await generate_random_mall_platform_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          quantityChange: -3,
          reason: "manual stock shrinkage adjustment",
        } satisfies IMallPlatformInventoryRecord.ICreate,
      },
    );
  typia.assert(adjustmentRecord);
  TestValidator.equals(
    "inventory adjustment should be linked to the same variant",
    adjustmentRecord.productVariant.id,
    variant.id,
  );
  TestValidator.equals(
    "inventory adjustment should preserve the signed quantity change",
    adjustmentRecord.quantityChange,
    -3,
  );
  TestValidator.equals(
    "inventory adjustment should preserve the reason text",
    adjustmentRecord.reason,
    "manual stock shrinkage adjustment",
  );
  TestValidator.notEquals(
    "inventory records should be separate append-only entries",
    initialRecord.id,
    adjustmentRecord.id,
  );
  TestValidator.predicate(
    "new inventory record should be created after the initial record",
    new Date(adjustmentRecord.createdAt).getTime() >=
      new Date(initialRecord.createdAt).getTime(),
  );
  TestValidator.predicate(
    "negative adjustment should reduce the effective quantity represented by history",
    initialRecord.quantityChange + adjustmentRecord.quantityChange <
      initialRecord.quantityChange,
  );
}
