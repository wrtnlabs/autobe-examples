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

export async function test_api_product_snapshot_retrieve_by_owner(
  connection: api.IConnection,
) {
  // 1. Admin joins and creates category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category: IEcommercePlatformCategory =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller joins
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Seller creates a product which triggers snapshot record generation
  const product: IEcommercePlatformProduct =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: { category_id: category.id },
      },
    );
  typia.assert(product);
  // 4. Retrieve product snapshot using productId and a generated snapshotId
  // Snapshots are auto-generated during product creation
  const snapshot: IEcommercePlatformSnapshotProduct =
    await api.functional.ecommercePlatform.seller.products.snapshots.at(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(snapshot);
  // 5. Validate snapshot metadata
  TestValidator.equals("entityType is product", snapshot.entityType, "product");
  TestValidator.predicate(
    "snapshot has createdAt",
    snapshot.createdAt !== undefined,
  );
  TestValidator.equals(
    "productId matches product",
    snapshot.productId,
    product.id,
  );
  // 6. Validate snapshot captures product state - nameCurrent matches product name
  TestValidator.equals(
    "nameCurrent matches product name",
    snapshot.nameCurrent,
    product.name,
  );
  // 7. Validate descriptionCurrent matches product description
  TestValidator.equals(
    "descriptionCurrent matches product description",
    snapshot.descriptionCurrent,
    product.description,
  );
  // 8. Validate categoryIdCurrent matches product category
  TestValidator.equals(
    "categoryIdCurrent matches category",
    snapshot.categoryIdCurrent,
    category.id,
  );
  // 9. Validate namePrevious is undefined for initial snapshot (newly created product has no previous state)
  TestValidator.equals(
    "namePrevious is undefined for new product",
    snapshot.namePrevious,
    undefined,
  );
  // 10. Validate descriptionPrevious is undefined for initial snapshot
  TestValidator.equals(
    "descriptionPrevious is undefined for new product",
    snapshot.descriptionPrevious,
    undefined,
  );
}
