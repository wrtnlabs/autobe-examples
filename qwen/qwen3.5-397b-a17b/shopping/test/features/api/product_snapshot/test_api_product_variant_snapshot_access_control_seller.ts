import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IPageIShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test that a seller cannot access variant snapshots from another seller's product, enforcing ownership-based access control per section 367.
 *
 * Validates the complete access control chain for product variant snapshots by setting up two independent seller accounts, creating a product with variants under one seller, and attempting to access the variant snapshot data from the other seller's context. This ensures that the ownership-based access control properly restricts sellers from viewing snapshot data belonging to other sellers' products.
 *
 * The test establishes a clear ownership boundary: Seller B owns the product and its snapshots, while Seller A attempts unauthorized access. The expected 403 Forbidden response confirms that the access control validates the full ownership chain from variant snapshot through product snapshot to the owning seller.
 *
 * 1. Seller A registers and authenticates (the unauthorized requester).
 * 2. Seller B registers and authenticates (the product owner).
 * 3. Seller B creates a product with name, description, category, and base price.
 * 4. Seller B creates a variant on the product with SKU code and option values.
 * 5. Seller B edits the variant to trigger automatic snapshot creation.
 * 6. Seller B retrieves product snapshots to obtain the snapshotId.
 * 7. Seller B retrieves variant snapshots list to obtain the variantSnapshotId.
 * 8. Seller A attempts to access Seller B's variant snapshot using the IDs.
 * 9. Validates that Seller A receives 403 Forbidden indicating access denied.
 */
export async function test_api_product_variant_snapshot_access_control_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as Seller A (unauthorized requester)
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 2. Register and authenticate as Seller B (product owner)
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 3. Seller B creates a product
  const product =
    await generate_random_shopping_mall_seller_products_create(
      sellerBConnection,
      {},
    );
  typia.assert(product);
  // 4. Seller B creates a variant on the product
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerBConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 5. Seller B edits the variant to trigger snapshot creation
  const updatedVariant =
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerBConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          sku_code: variant.sku_code + "_updated",
          option_values: variant.option_values,
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 6. Seller B retrieves product snapshots to get snapshotId
  const productSnapshots =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerBConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(productSnapshots);
  TestValidator.predicate(
    "product has snapshots",
    () => productSnapshots.data.length > 0,
  );
  const snapshotId = productSnapshots.data[0]!.id;
  // 7. Seller B retrieves variant snapshots list to get variantSnapshotId
  const variantSnapshots =
    await api.functional.shoppingMall.seller.productSnapshots.variantSnapshots.index(
      sellerBConnection,
      {
        productSnapshotId: snapshotId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(variantSnapshots);
  TestValidator.predicate(
    "product snapshot has variant snapshots",
    () => variantSnapshots.data.length > 0,
  );
  const variantSnapshotId = variantSnapshots.data[0]!.id;
  // 8. Seller A attempts to access Seller B's variant snapshot (should fail with 403)
  await TestValidator.error(
    "Seller A cannot access Seller B's variant snapshot",
    async () => {
      await api.functional.shoppingMall.seller.products.snapshots.variant_snapshots.at(
        sellerAConnection,
        {
          productId: product.id,
          snapshotId: snapshotId,
          variantSnapshotId: variantSnapshotId,
        },
      );
    },
  );
}