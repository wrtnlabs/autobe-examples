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
 * Test seller retrieval of own product snapshot history with pagination.
 *
 * Validates that a seller can successfully retrieve the snapshot history of their own product through the PATCH /shoppingMall/seller/products/{productId}/snapshots endpoint. The test ensures proper authorization, snapshot data structure, and pagination metadata.
 *
 * Setup includes administrator creating a product category, seller registration and authentication, and product creation which automatically generates initial snapshot records.
 *
 * 1. Administrator joins, authenticates, and creates a product category.
 * 2. Seller joins and authenticates with valid credentials.
 * 3. Seller creates a product under the category, generating initial snapshot.
 * 4. Seller retrieves snapshot history with pagination parameters.
 * 5. Validates response structure, snapshot data, and pagination metadata.
 */
export async function test_api_product_snapshot_seller_own_product_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    },
  });
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const sellerLogin = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerLogin);
  // 3. Seller creates product (generates initial snapshot)
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product);
  // 4. Seller retrieves snapshot history with pagination
  const snapshotResponse =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshotResponse);
  // 5. Validate pagination metadata
  TestValidator.predicate(
    "current page is 1",
    snapshotResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit is 10",
    snapshotResponse.pagination.limit === 10,
  );
  TestValidator.predicate(
    "records count is positive",
    snapshotResponse.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pages count is positive",
    snapshotResponse.pagination.pages >= 1,
  );
  // 6. Validate snapshot data structure
  TestValidator.predicate(
    "data array is not empty",
    snapshotResponse.data.length >= 1,
  );
  const firstSnapshot = snapshotResponse.data[0]!;
  TestValidator.equals(
    "snapshot name matches product",
    firstSnapshot.name,
    product.name,
  );
  TestValidator.equals(
    "snapshot base_price matches product",
    firstSnapshot.base_price,
    product.base_price,
  );
  TestValidator.predicate(
    "snapshot has category",
    firstSnapshot.category !== null,
  );
  TestValidator.equals(
    "category id matches",
    firstSnapshot.category.id,
    category.id,
  );
  TestValidator.equals(
    "category name matches",
    firstSnapshot.category.name,
    category.name,
  );
  TestValidator.predicate(
    "snapshot has valid created_at timestamp",
    typeof firstSnapshot.created_at === "string",
  );
}
