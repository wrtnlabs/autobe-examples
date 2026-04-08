import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test administrator retrieval of any seller's product snapshot history for platform oversight.
 *
 * Validates that administrators can access product snapshot history for any product on the platform, regardless of seller ownership. This capability is essential for administrative audit, dispute resolution, and platform-wide oversight.
 *
 * The test establishes a complete product lifecycle scenario where an administrator creates a category, a seller creates a product under that category, and then the administrator retrieves the snapshot history. Product snapshots are immutable audit records capturing the complete product state at the time of each edit, including name, base_price, and category assignment.
 *
 * 1. Administrator joins and authenticates to create a product category.
 * 2. Administrator creates a category for product organization.
 * 3. Seller joins and authenticates to create a product.
 * 4. Seller creates a product under the administrator-created category.
 * 5. Administrator authenticates and retrieves snapshot history of the seller's product.
 * 6. Validates response contains pagination metadata and snapshot records with preserved historical state.
 * 7. Confirms administrator can access snapshots across all platform products regardless of ownership.
 */
export async function test_api_product_snapshot_admin_any_product_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - create account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    },
  });
  typia.assert(adminJoin);
  // 2. Administrator creates a product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 3. Seller setup - create account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerJoin);
  // 4. Seller creates a product under the category
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_mall_category_id: category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 5. Administrator retrieves snapshot history of seller's product
  const snapshotResponse =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshotResponse);
  // 6. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page",
    () => snapshotResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit",
    () => snapshotResponse.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records count",
    () => snapshotResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count",
    () => snapshotResponse.pagination.pages >= 0,
  );
  // 7. Validate each snapshot contains required historical data and matches product state
  for (const snapshot of snapshotResponse.data) {
    TestValidator.predicate(
      "snapshot name preserved",
      () => snapshot.name.length > 0,
    );
    TestValidator.predicate(
      "snapshot base price positive",
      () => snapshot.base_price > 0,
    );
    TestValidator.predicate(
      "snapshot category exists",
      () => snapshot.category !== null && snapshot.category !== undefined,
    );
    TestValidator.predicate(
      "snapshot category has ID",
      () => snapshot.category.id.length > 0,
    );
    TestValidator.predicate(
      "snapshot category name preserved",
      () => snapshot.category.name.length > 0,
    );
    TestValidator.predicate(
      "snapshot created_at valid",
      () => snapshot.created_at.length > 0,
    );
  }
  // 8. Validate snapshot contains the product's initial state (first snapshot should match created product)
  if (snapshotResponse.data.length > 0) {
    const initialSnapshot = snapshotResponse.data[0];
    TestValidator.equals(
      "snapshot name matches product name",
      initialSnapshot.name,
      product.name,
    );
    TestValidator.equals(
      "snapshot base price matches product base price",
      initialSnapshot.base_price,
      product.base_price,
    );
    TestValidator.equals(
      "snapshot category ID matches product category ID",
      initialSnapshot.category.id,
      product.category.id,
    );
  }
  // 9. Validate snapshot ordering (created_at DESC - newest first)
  if (snapshotResponse.data.length > 1) {
    for (let i = 0; i < snapshotResponse.data.length - 1; i++) {
      const current = new Date(snapshotResponse.data[i].created_at).getTime();
      const next = new Date(snapshotResponse.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `snapshot ${i} is newer than snapshot ${i + 1}`,
        () => current >= next,
      );
    }
  }
}
