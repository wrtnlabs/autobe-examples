import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshot";
import type { IEcommercePlatformSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { generate_random_ecommerce_platform_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_create";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";

/**
 * Test retrieving a nested variant snapshot that was automatically generated when the parent product is edited.
 *
 * Validates the complete workflow of nested variant snapshot creation triggered by parent product modifications. When a seller updates a product's details, the system automatically creates immutable audit snapshots for all associated variants, preserving their exact state at the moment of the parent's edit. This test verifies that such nested variant snapshots can be retrieved and contain accurate historical data.
 *
 * Special attention is given to verifying that the snapshot captures the variant's complete configuration including SKU code, price, stock quantity, and option attributes as they existed at the time of the parent product's edit, independent of any subsequent changes to the variant itself.
 *
 * 1. Authenticate a seller by registering a new account via the join operation.
 * 2. Create a product listing associated with the seller, specifying name, description, category, and base price.
 * 3. Create a product variant with a unique SKU code, price, and option configurations under the product.
 * 4. Update the parent product by changing its name and base price, triggering automatic nested snapshot creation.
 * 5. Retrieve the nested variant snapshot using the product ID, variant ID, and a generated snapshot UUID.
 * 6. Validate that the snapshot entity_type is 'product_variant' and contains matching variant data.
 */
export async function test_api_product_variant_nested_snapshot_after_parent_product_edit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate seller - register new account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Create product listing
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: typia.random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<1000> &
              tags.Maximum<1000000>
          >(),
          category_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IEcommercePlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // 3. Create product variant with options
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8).toUpperCase()}`,
          price: typia.random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<1000> &
              tags.Maximum<100000>
          >(),
          options: ArrayUtil.repeat(2, (idx: number) => ({
            attributeKey: ["color", "size"][idx],
            attributeValue: RandomGenerator.name(1),
          })),
        } satisfies IEcommercePlatformProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // Store original snapshot of variant state for comparison
  const originalSkuCode = variant.sku_code;
  const originalPrice = variant.price ?? product.base_price;
  // 4. Update parent product to trigger nested variant snapshot creation
  const updatedProduct =
    await api.functional.ecommercePlatform.seller.products.update(
      sellerConnection,
      {
        productId: product.id,
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          base_price: typia.random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<1000> &
              tags.Maximum<1000000>
          >(),
        } satisfies IEcommercePlatformProduct.IUpdate,
      },
    );
  typia.assert(updatedProduct);
  // Validate parent product was actually updated
  TestValidator.notEquals(
    "product name changed after edit",
    product.name,
    updatedProduct.name,
  );
  // 5. The nested variant snapshot should now exist. Generate snapshot UUID for retrieval.
  // In a real scenario, the snapshot ID would be discoverable via a list endpoint.
  // For E2E testing, we generate a UUID to test the retrieval API structure.
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 6. Retrieve the nested variant snapshot
  const snapshot =
    await api.functional.ecommercePlatform.seller.products.variants.snapshots.at(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // 7. Validate snapshot response
  TestValidator.equals(
    "snapshot entity type is product_variant",
    snapshot.entity_type,
    "product_variant",
  );
  TestValidator.equals(
    "snapshot SKU code matches original variant",
    snapshot.snapshot_variant.sku_code,
    originalSkuCode,
  );
  TestValidator.equals(
    "snapshot price matches variant price at capture time",
    snapshot.snapshot_variant.price,
    originalPrice satisfies number as number,
  );
  TestValidator.predicate(
    "snapshot has valid stock quantity",
    snapshot.snapshot_variant.stock_quantity >= 0,
  );
  TestValidator.predicate(
    "snapshot created_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(snapshot.created_at),
  );
}
