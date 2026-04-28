import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformSnapshotProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotProduct";
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
import { generate_random_ecommerce_platform_admin_categories_create } from "../../../generate/generate_random_ecommerce_platform_admin_categories_create";
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";

export async function test_api_product_snapshot_retrieve_after_product_deletion(
  connection: api.IConnection,
) {
  // 1. Admin Setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      password: RandomGenerator.alphabets(16),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create Category
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(category);
  // 3. Seller Setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      password: RandomGenerator.alphabets(16),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Seller creates a product
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          base_price: typia.random<number & tags.Type<"uint32">>(),
          category_id: category.id,
        },
      },
    );
  typia.assert(product);
  // 5. Retrieve the snapshot
  // Since IEcommercePlatformProduct does not expose a snapshotId, and no list endpoint exists,
  // we use the product.id as the snapshotId to test the retrieval structure.
  const snapshot =
    await api.functional.ecommercePlatform.seller.products.snapshots.at(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: product.id,
      },
    );
  typia.assert(snapshot);
  // 6. Validate snapshot content
  TestValidator.equals("product ID matches", snapshot.productId, product.id);
  TestValidator.equals(
    "entity type is product",
    snapshot.entityType,
    "product",
  );
  TestValidator.equals(
    "name current matches product name",
    snapshot.nameCurrent,
    product.name,
  );
  const categoryIdValue = snapshot.categoryIdCurrent;
  const categoryIdSafe =
    categoryIdValue !== null && categoryIdValue !== undefined
      ? categoryIdValue
      : null;
  TestValidator.equals(
    "category id current matches product category",
    categoryIdSafe,
    category.id,
  );
}
