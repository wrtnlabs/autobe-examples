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

/**
 * Test successful comparison of two product snapshots.
 *
 * 1. Admin joins and creates category
 * 2. Seller joins and creates product (generates first snapshot)
 * 3. Call compare endpoint for the product
 * 4. Validate the comparison result structure
 */
export async function test_api_product_snapshot_compare_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 3. Create product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Test Product Name",
        description: "Test product description",
        categoryId: category.id,
        basePrice: 100,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Compare product snapshots - pass productId only as per SDK signature
  const comparison: IEcommerceMallProductSnapshotComparison =
    await api.functional.ecommerceMall.seller.products.snapshots.compare(
      sellerConnection,
      { productId: product.id },
    );
  typia.assert(comparison);
  // 5. Validate response structure
  TestValidator.predicate(
    "has source snapshot ID",
    !!comparison.sourceSnapshotId,
  );
  TestValidator.predicate(
    "has valid source snapshot UUID",
    typia.is<string & tags.Format<"uuid">>(comparison.sourceSnapshotId),
  );
  // targetSnapshotId can be string or null
  if (comparison.targetSnapshotId !== null) {
    TestValidator.predicate(
      "has valid target snapshot UUID",
      typia.is<string & tags.Format<"uuid">>(comparison.targetSnapshotId),
    );
  }
  // Validate arrays are present
  TestValidator.predicate(
    "imagesAdded is array",
    Array.isArray(comparison.imagesAdded),
  );
  TestValidator.predicate(
    "imagesRemoved is array",
    Array.isArray(comparison.imagesRemoved),
  );
  // imagesReordered and variantsChanged are strings per the DTO
  TestValidator.predicate(
    "imagesReordered is string",
    typeof comparison.imagesReordered === "string",
  );
  TestValidator.predicate(
    "variantsChanged is string",
    typeof comparison.variantsChanged === "string",
  );
}
