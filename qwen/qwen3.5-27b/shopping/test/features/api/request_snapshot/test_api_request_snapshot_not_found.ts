import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRequestSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that attempting to retrieve a non-existent request snapshot returns a 404 Not Found error.
 *
 * This test validates the error handling behavior when a seller attempts to access a request snapshot that does not exist in the system. Request snapshots are immutable audit records created when sellers respond to cancellation or refund requests. The test ensures that invalid or deleted snapshot references are properly rejected with appropriate HTTP error responses.
 *
 * The test follows these steps:
 * 1. Register and authenticate as a seller using the join operation
 * 2. Generate a random UUID that does not correspond to any existing snapshot
 * 3. Attempt to retrieve the non-existent snapshot via GET /shoppingMall/seller/request-snapshots/{snapshotId}
 * 4. Validate that the API responds with a 404 Not Found error
 *
 * This ensures proper handling of invalid snapshot references and prevents unauthorized access to non-existent audit records.
 */
export async function test_api_request_snapshot_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Generate a non-existent snapshot ID (valid UUID format but doesn't exist)
  const nonExistentSnapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve the non-existent snapshot
  await TestValidator.httpError(
    "non-existent snapshot returns 404",
    404,
    async () =>
      await api.functional.shoppingMall.seller.request_snapshots.at(
        sellerConnection,
        {
          snapshotId: nonExistentSnapshotId,
        },
      ),
  );
}
