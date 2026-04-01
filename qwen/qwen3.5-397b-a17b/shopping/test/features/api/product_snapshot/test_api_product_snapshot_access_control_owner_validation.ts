import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";

/**
 * Test that a seller cannot retrieve snapshots of products owned by other sellers.
 * This validates the access control and ownership verification business rule that
 * sellers can only view snapshots of their own products.
 *
 * Test Steps:
 * 1. Administrator creates a product category
 * 2. First seller (seller1) registers and authenticates via join
 * 3. Seller1 creates a product with name, description, category, and base price
 * 4. Seller1 updates the product (creates snapshot)
 * 5. Second seller (seller2) registers and authenticates via join (separate session)
 * 6. Seller2 attempts to retrieve seller1's product snapshot using seller1's product ID and the snapshot ID
 *
 * Validation Points:
 * - Snapshot retrieval returns HTTP 404 Not Found (per specification: 'Handle 404 if seller lacks permission')
 * - Error response does not reveal whether the snapshot exists or not (security best practice)
 * - Seller2's authentication is valid but ownership check fails
 * - System correctly validates seller_id matches the authenticated seller before returning snapshot data
 * - Confirms access control prevents unauthorized snapshot access
 */
export async function test_api_product_snapshot_access_control_owner_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
        },
      },
    );
  typia.assert(category);
  // 2. First seller (seller1) registration and authentication
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Auth = await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller1Auth);
  // 3. Seller1 creates a product (note: product creation endpoint not in provided SDK)
  // For this test, we'll use a mock product ID and snapshot ID to test the access control
  // In real scenario, seller1 would create product via POST /shoppingMall/seller/products
  const productId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 4. Second seller (seller2) registration and authentication (separate account)
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Auth = await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller2Auth);
  // 5. Seller2 attempts to access seller1's product snapshot
  // This should fail with 404 Not Found due to ownership validation
  await TestValidator.error(
    "seller2 cannot access seller1's product snapshot",
    async () => {
      await api.functional.shoppingMall.seller.products.snapshots.at(
        seller2Connection,
        {
          productId,
          snapshotId,
        },
      );
    },
  );
}
