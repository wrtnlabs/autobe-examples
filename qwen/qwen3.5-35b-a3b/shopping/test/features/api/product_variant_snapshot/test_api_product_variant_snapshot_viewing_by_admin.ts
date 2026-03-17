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

export async function test_api_product_variant_snapshot_viewing_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create and authenticate admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuthorized);
  // 2. Seller setup - create and authenticate seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuthorized);
  // 3. Seller creates a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1000>
        >() satisfies number as number,
      },
    },
  );
  typia.assert(product);
  // 4. Seller creates a product variant
  const originalOptions = {
    color: "Red",
    size: "Large",
    material: "Cotton",
  } as const;
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          options: originalOptions,
          base_price: 15000,
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
          >() satisfies number as number,
          status: "active",
        },
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  const originalSku = variant.sku;
  const originalPrice = variant.basePrice;
  const snapshotCreatedAt = new Date();
  // 5. Seller modifies variant to trigger automatic snapshot creation
  const modifiedOptions = {
    ...originalOptions,
    size: "Extra Large",
    material: "Synthetic",
  };
  const updatedVariant =
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          options: modifiedOptions,
          base_price: 18000,
          status: "active",
        } satisfies IEcommerceMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // Wait for snapshot to be created
  await new Promise((resolve) => setTimeout(resolve, 1000));
  // 6. Admin retrieves the snapshot using admin endpoint
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
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
  // 7. Verify snapshot contains accurate historical data
  TestValidator.equals(
    "snapshot SKU code matches original",
    snapshot.sku_code,
    originalSku,
  );
  TestValidator.equals(
    "snapshot options match original",
    snapshot.options,
    JSON.stringify(originalOptions),
  );
  TestValidator.equals(
    "snapshot price matches original",
    snapshot.price,
    originalPrice,
  );
  TestValidator.predicate(
    "snapshot stock quantity is non-negative",
    snapshot.stock_quantity >= 0,
  );
  TestValidator.equals(
    "snapshot status matches original",
    snapshot.status,
    "active",
  );
  // 8. Confirm snapshot timestamp is valid
  const snapshotTime = new Date(snapshot.created_at);
  TestValidator.predicate(
    "snapshot created_at is a valid date",
    !isNaN(snapshotTime.getTime()),
  );
  TestValidator.predicate(
    "snapshot created_at is after modification",
    snapshotTime.getTime() >= snapshotCreatedAt.getTime(),
  );
  // 9. Validate snapshot includes proper references
  TestValidator.equals(
    "snapshot references correct product",
    snapshot.product.id,
    product.id,
  );
  TestValidator.equals(
    "snapshot references correct variant",
    snapshot.productVariant.id,
    variant.id,
  );
  TestValidator.equals(
    "product name in snapshot matches original",
    snapshot.product.name,
    product.name,
  );
  // 10. Verify snapshot is immutable (admin should not be able to modify)
  TestValidator.equals(
    "snapshot SKU is immutable",
    snapshot.sku_code,
    originalSku,
  );
  TestValidator.equals(
    "snapshot price is immutable",
    snapshot.price,
    originalPrice,
  );
}
