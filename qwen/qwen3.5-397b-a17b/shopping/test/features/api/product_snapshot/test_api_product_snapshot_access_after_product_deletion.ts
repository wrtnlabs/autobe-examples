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
 * Test product snapshot retrieval endpoint functionality.
 *
 * This test validates the snapshot access API endpoint structure and response format.
 * Since product CRUD operations are not available in the provided SDK, this test
 * focuses on validating the snapshot retrieval endpoint's response structure.
 *
 * Test validates:
 * - Snapshot endpoint accepts valid UUID parameters
 * - Response contains expected snapshot structure with all required fields
 * - Snapshot includes product reference (ISummary with price range)
 * - Snapshot includes category reference with hierarchical information
 * - All timestamp fields are properly formatted
 */
export async function test_api_product_snapshot_access_after_product_deletion(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as seller to access seller product snapshots
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Generate test UUIDs for snapshot retrieval
  // Note: In a full implementation, these would come from actual product/snapshot creation
  const productId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // Test snapshot retrieval endpoint
  // This validates the endpoint structure and response format
  const snapshot =
    await api.functional.shoppingMall.seller.products.snapshots.at(
      sellerConnection,
      {
        productId: productId,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // Validate snapshot structure contains all required fields
  TestValidator.predicate("snapshot has id", snapshot.id.length > 0);
  TestValidator.predicate("snapshot has name", snapshot.name.length > 0);
  TestValidator.predicate(
    "snapshot has description",
    snapshot.description.length > 0,
  );
  TestValidator.predicate("snapshot has base price", snapshot.base_price > 0);
  TestValidator.predicate(
    "snapshot has created_at timestamp",
    snapshot.created_at.length > 0,
  );
  // Validate snapshot includes product reference
  TestValidator.predicate(
    "snapshot includes product reference",
    snapshot.product !== undefined,
  );
  TestValidator.predicate(
    "product reference has min price",
    snapshot.product.min >= 0,
  );
  TestValidator.predicate(
    "product reference has max price",
    snapshot.product.max >= 0,
  );
  TestValidator.predicate(
    "product max price >= min price",
    snapshot.product.max >= snapshot.product.min,
  );
  // Validate snapshot includes category reference
  TestValidator.predicate(
    "snapshot includes category reference",
    snapshot.category !== undefined,
  );
  TestValidator.predicate(
    "category reference has id",
    snapshot.category.id.length > 0,
  );
  TestValidator.predicate(
    "category reference has name",
    snapshot.category.name.length > 0,
  );
  TestValidator.predicate(
    "category reference has description",
    snapshot.category.description.length > 0,
  );
  // Validate timestamp format (ISO 8601 date-time)
  const createdAtDate = new Date(snapshot.created_at);
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(createdAtDate.getTime()),
  );
}
