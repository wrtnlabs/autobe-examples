import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_product_variant_snapshot_relationship_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin Setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin123!@#admin",
      href: "https://admin.example.com/join",
      referrer: "https://admin.example.com/",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Seller Setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Seller123!@#seller",
      href: "https://seller.example.com/join",
      referrer: "https://seller.example.com/",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 3. Create Category for Product
  const categoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Seller Creates Product
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 8,
        }),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
          wordMin: 4,
          wordMax: 8,
        }),
        category_id: categoryId,
        base_price: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<1000> &
            tags.Maximum<100000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 5. Seller Creates Product Variant
  const originalOptions: {
    [key: string]: string;
  } = {
    size: RandomGenerator.pick(["S", "M", "L", "XL", "XXL"]),
    color: RandomGenerator.pick(["Red", "Blue", "Green", "Black", "White"]),
    material: RandomGenerator.pick(["Cotton", "Polyester", "Wool", "Silk"]),
  };
  const variant =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku: typia.random<string & tags.MaxLength<50>>(),
          options: originalOptions,
          base_price: typia.random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<1000> &
              tags.Maximum<50000>
          >(),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<1000>
          >(),
          status: "active",
          is_default: true,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // Store original variant state for snapshot comparison
  const originalState = {
    sku: variant.sku,
    basePrice: variant.basePrice,
    stockQuantity: variant.stockQuantity,
    status: variant.status,
    options: variant.options,
  };
  // 6. Modify Variant to Trigger Snapshot Creation
  const updatedState = {
    sku: `UPDATED-${variant.sku}`,
    basePrice: Math.round(variant.basePrice * 1.2), // 20% price increase
    status: "inactive",
  };
  const updatedVariant =
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          sku: updatedState.sku,
          base_price: updatedState.basePrice,
          status: updatedState.status,
        } satisfies IEcommerceMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 7. Create a valid snapshot ID to retrieve (the system should create snapshots)
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const snapshot =
    await api.functional.ecommerceMall.admin.products.variants.snapshots.at(
      adminConnection,
      {
        productId: product.id,
        variantId: variant.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // 8. Validate Snapshot Relationships
  // Verify product relationship matches path
  TestValidator.equals(
    "snapshot product matches path product_id",
    snapshot.product.id,
    product.id,
  );
  // Verify productVariant relationship matches path
  TestValidator.equals(
    "snapshot productVariant matches path variant_id",
    snapshot.productVariant.id,
    variant.id,
  );
  // Verify snapshot id matches the snapshotId parameter
  TestValidator.equals(
    "snapshot id matches snapshotId parameter",
    snapshot.id,
    snapshotId,
  );
  // 9. Validate Required Fields Exist
  TestValidator.equals(
    "snapshot has required id field",
    snapshot.id !== undefined,
    true,
  );
  TestValidator.equals(
    "snapshot has required sku_code field",
    snapshot.sku_code !== undefined,
    true,
  );
  TestValidator.equals(
    "snapshot has required options field",
    snapshot.options !== undefined,
    true,
  );
  TestValidator.equals(
    "snapshot has required price field",
    snapshot.price !== undefined,
    true,
  );
  TestValidator.equals(
    "snapshot has required stock_quantity field",
    snapshot.stock_quantity !== undefined,
    true,
  );
  TestValidator.equals(
    "snapshot has required status field",
    snapshot.status !== undefined,
    true,
  );
  TestValidator.equals(
    "snapshot has required created_at field",
    snapshot.created_at !== undefined,
    true,
  );
  // 10. Validate Previous Values Match Original State
  // The snapshot should contain the state BEFORE modification
  TestValidator.equals(
    "snapshot sku_code matches original SKU",
    snapshot.sku_code,
    originalState.sku,
  );
  TestValidator.equals(
    "snapshot price matches original base_price",
    snapshot.price,
    originalState.basePrice,
  );
  TestValidator.equals(
    "snapshot stock_quantity matches original stock_quantity",
    snapshot.stock_quantity,
    originalState.stockQuantity,
  );
  TestValidator.equals(
    "snapshot status matches original status",
    snapshot.status,
    originalState.status,
  );
  // 11. Test Error Handling: Invalid Snapshot ID (404)
  const invalidSnapshotId: string & tags.Format<"uuid"> =
    "00000000-0000-0000-0000-000000000000";
  await TestValidator.httpError(
    "invalid snapshotId returns 404",
    404,
    async () => {
      await api.functional.ecommerceMall.admin.products.variants.snapshots.at(
        adminConnection,
        {
          productId: product.id,
          variantId: variant.id,
          snapshotId: invalidSnapshotId,
        },
      );
    },
  );
  // 12. Test Error Handling: Snapshot Not Belonging to Variant (404)
  const randomVariantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "snapshot not belonging to variant returns 404",
    404,
    async () => {
      await api.functional.ecommerceMall.admin.products.variants.snapshots.at(
        adminConnection,
        {
          productId: product.id,
          variantId: randomVariantId,
          snapshotId: snapshotId,
        },
      );
    },
  );
}
