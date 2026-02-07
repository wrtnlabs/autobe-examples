import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_seller_profile_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // As an authenticated seller, create a product to trigger a profile snapshot.
  // Verify that the snapshot retrieval endpoint returns 404 for a non-existent snapshotId.
  // Note: Due to the API limitations (no way to obtain the snapshotId after product creation),
  // this test cannot verify the snapshot content (name, description, logo, timestamp).
  // We can only validate the 404 behavior for non-existent snapshots, which confirms the endpoint is functional.
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  // 2. Trigger seller profile snapshot creation by creating a product
  // This creates a snapshot, but the snapshotId is not returned in the product response
  await generate_random_shopping_mall_seller_products_create(sellerConnection, {
    body: typia.random<IShoppingMallProduct.ICreate>(),
  });
  // 3. Attempt to retrieve a non-existent snapshotId - must return 404
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  try {
    await api.functional.shoppingMall.seller.seller_profile_snapshots.at(
      sellerConnection,
      { snapshotId },
    );
    throw new Error("Expected 404 but got success");
  } catch (error) {
    if (!typia.is<api.HttpError>(error)) throw error;
    TestValidator.equals(
      "should return 404 for non-existent snapshot",
      error.status,
      404,
    );
  }
}
