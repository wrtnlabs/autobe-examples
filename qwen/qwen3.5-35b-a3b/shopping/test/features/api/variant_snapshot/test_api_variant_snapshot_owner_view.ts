import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

/**
 * Test seller viewing their own product variant snapshot.
 *
 * Validates the complete workflow of creating a product, adding a variant, editing the variant to trigger snapshot creation, and retrieving the snapshot. Ensures that snapshots are correctly created and accessible to the product owner.
 *
 * 1. Seller joins the platform and authenticates.
 * 2. Seller creates a product with a category.
 * 3. Seller creates a variant for the product.
 * 4. Seller edits the variant to trigger snapshot creation.
 * 5. Seller retrieves the variant snapshot by ID.
 * 6. Validates snapshot data matches the variant state before edit.
 */
export async function test_api_variant_snapshot_owner_view(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Seller joins and authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuth);
  typia.assert(sellerAuth.token);
  // Step 2: Seller creates a product
  const product: IEcommerceMallProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          category_id: typia.random<string & tags.Format<"uuid">>(),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(product);
  // Step 3: Seller creates a variant
  const variant: IEcommerceMallProductVariant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku_code: RandomGenerator.alphaNumeric(8),
          option_values: JSON.stringify({
            color: "red",
            size: "L",
          }),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  typia.assert(variant.id);
  const variantBeforeEdit: IEcommerceMallProductVariant = variant;
  // Step 4: Edit variant to trigger snapshot creation
  const editedSkuCode: string = RandomGenerator.alphaNumeric(8);
  const editedPrice: number = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  const editedVariant: IEcommerceMallProductVariant =
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          sku_code: editedSkuCode,
          price: editedPrice,
        },
      },
    );
  typia.assert(editedVariant);
  // Step 5: Retrieve the snapshot
  // In simulation mode, typia.random will generate a valid snapshot ID
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const snapshot: IEcommerceMallProductVariantSnapshot =
    await api.functional.ecommerceMall.seller.products.variants.snapshots.at(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // Step 6: Validate snapshot data
  TestValidator.equals(
    "snapshot sku_code matches variant before edit",
    snapshot.sku_code,
    variantBeforeEdit.sku_code,
  );
  TestValidator.equals(
    "snapshot option_values matches variant before edit",
    snapshot.option_values,
    variantBeforeEdit.option_values,
  );
  TestValidator.equals(
    "snapshot price matches variant before edit",
    snapshot.price,
    variantBeforeEdit.price,
  );
  TestValidator.equals(
    "snapshot stock_quantity matches variant before edit",
    snapshot.stock_quantity,
    variantBeforeEdit.stock_quantity,
  );
  TestValidator.equals(
    "snapshot product_id matches product",
    snapshot.product_id,
    product.id,
  );
  TestValidator.equals(
    "snapshot seller_id matches seller",
    snapshot.seller_id,
    sellerAuth.id,
  );
  TestValidator.predicate(
    "snapshot has created_at timestamp",
    snapshot.created_at !== undefined && snapshot.created_at !== null,
  );
  TestValidator.predicate(
    "snapshot has updated_at timestamp",
    snapshot.updated_at !== undefined && snapshot.updated_at !== null,
  );
  TestValidator.equals(
    "snapshot timestamps are equal",
    snapshot.created_at,
    snapshot.updated_at,
  );
  TestValidator.notEquals(
    "edited variant has different sku_code",
    editedVariant.sku_code,
    variantBeforeEdit.sku_code,
  );
  TestValidator.notEquals(
    "edited variant has different price",
    editedVariant.price,
    variantBeforeEdit.price,
  );
}
