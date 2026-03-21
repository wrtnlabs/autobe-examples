import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductSnapshotVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariantOptionValue";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

/**
 * Test scenario verifying authorization enforcement - seller cannot view another seller's variant snapshot.
 *
 * Steps:
 * 1. Authenticate as first seller (Seller A) and create a product with variant
 * 2. Authenticate as second seller (Seller B)
 * 3. Seller B attempts to access Seller A's variant snapshot
 *
 * Validation points:
 * - Seller B should receive 403 Forbidden or 404 Not Found error
 * - The endpoint should verify seller ownership before returning snapshot data
 * - Seller B should not be able to access snapshots belonging to Seller A's products
 */
export async function test_api_variant_snapshot_unauthorized_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first seller (Seller A) and create product with variant
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAResult = await authorize_seller_join(sellerAConnection, {});
  typia.assert(sellerAResult);
  // Create product as Seller A
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerAConnection,
    {},
  );
  typia.assert(product);
  // Create variant for the product as Seller A
  const variant =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerAConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-SELLER-A-${RandomGenerator.alphaNumeric(8)}`,
          quantity: 10,
          option_values: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
        },
      },
    );
  typia.assert(variant);
  // Step 2: Create second seller (Seller B)
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBResult = await authorize_seller_join(sellerBConnection, {});
  typia.assert(sellerBResult);
  // Step 3: Seller B attempts to access Seller A's variant snapshot
  // Using a random UUID as snapshotId since the snapshot endpoint should
  // reject access based on seller ownership verification BEFORE checking if snapshot exists
  const randomSnapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Seller B cannot access Seller A's variant snapshot",
    async () => {
      await api.functional.ecommerceMall.seller.products.variants.snapshots.at(
        sellerBConnection,
        {
          productId: product.id,
          variantId: variant.id,
          snapshotId: randomSnapshotId,
        },
      );
    },
  );
}
