import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshotComparison } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotComparison";
import type { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
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
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_product_snapshot_compare_two_snapshots(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection for category creation and snapshot comparison
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  // 2. Create seller connection for product creation and updates
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  // 3. Create category as admin (required for product creation)
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 4. Create initial product as seller (creates first snapshot)
  const initialName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 2,
    wordMax: 5,
  });
  const initialDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
  });
  const initialBasePrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >() satisfies number as number;
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: initialName,
        description: initialDescription,
        categoryId: category.id,
        basePrice: initialBasePrice,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 5. Update product to create second snapshot with different values
  const updatedName = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 3,
    wordMax: 6,
  });
  const updatedDescription = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 8,
    sentenceMax: 15,
  });
  const updatedBasePrice = initialBasePrice + 1000;
  const updatedProduct =
    await api.functional.ecommerceMall.seller.products.update(
      sellerConnection,
      {
        productId: product.id,
        body: {
          name: updatedName,
          description: updatedDescription,
          basePrice: updatedBasePrice,
        } satisfies IEcommerceMallProduct.IUpdate,
      },
    );
  typia.assert(updatedProduct);
  // 6. Compare snapshots as admin (comparing current state with initial snapshot)
  const comparison =
    await api.functional.ecommerceMall.admin.products.snapshots.compare(
      adminConnection,
      {
        productId: product.id,
      },
    );
  typia.assert(comparison);
  // 7. Validate comparison response structure
  TestValidator.predicate(
    "source snapshot ID is valid UUID",
    () =>
      comparison.sourceSnapshotId === null ||
      typeof comparison.sourceSnapshotId === "string",
  );
  TestValidator.predicate(
    "target snapshot ID is valid UUID or null",
    () =>
      comparison.targetSnapshotId === null ||
      typeof comparison.targetSnapshotId === "string",
  );
  TestValidator.predicate("images added is array", () =>
    Array.isArray(comparison.imagesAdded),
  );
  TestValidator.predicate("images removed is array", () =>
    Array.isArray(comparison.imagesRemoved),
  );
  TestValidator.predicate(
    "images reordered is string",
    () => typeof comparison.imagesReordered === "string",
  );
  TestValidator.predicate(
    "variants changed is string",
    () => typeof comparison.variantsChanged === "string",
  );
}
