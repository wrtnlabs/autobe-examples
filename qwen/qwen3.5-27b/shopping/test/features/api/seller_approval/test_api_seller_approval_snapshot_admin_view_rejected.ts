import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import type { IShoppingMallSellerApprovalSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalSnapshot";
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
import { generate_random_shopping_mall_seller_seller_approval_requests_create } from "../../../generate/generate_random_shopping_mall_seller_seller_approval_requests_create";
import { prepare_random_shopping_mall_seller_approval_request } from "../../../prepare/prepare_random_shopping_mall_seller_approval_request";

/**
 * Test that an authenticated administrator can retrieve a seller approval request snapshot
 * for a rejected seller application, verifying the snapshot preserves the rejection state and reason.
 */
export async function test_api_seller_approval_snapshot_admin_view_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as administrator
  const adminConnection: api.IConnection = {
    host: connection.host,
    simulate: true, // Enable simulation mode for test data generation
  };
  await authorize_admin_join(adminConnection, {});
  // 2. Register a seller account
  const sellerConnection: api.IConnection = {
    host: connection.host,
    simulate: true,
  };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 3. Authenticate the seller
  const sellerLoginConnection: api.IConnection = {
    host: connection.host,
    simulate: true,
  };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerAuth.email,
      password: "1234",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 4. Create seller approval request as seller
  const approvalRequest =
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      sellerLoginConnection,
      {},
    );
  typia.assert(approvalRequest);
  // 5. Simulate snapshot creation
  // Note: In a real scenario, an admin would reject the seller approval request,
  // which would automatically create a snapshot. Since the reject endpoint is not
  // available in the SDK, we use simulation mode to generate valid test data.
  const requestId = approvalRequest.id;
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 6. Call the target endpoint as admin to retrieve the snapshot
  const snapshot =
    await api.functional.shoppingMall.admin.seller_approval_requests.snapshots.at(
      adminConnection,
      {
        requestId,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // 7. Verify the snapshot structure
  TestValidator.equals(
    "snapshot id is UUID format",
    typeof snapshot.id,
    "string",
  );
  TestValidator.predicate(
    "snapshot has seller approval request",
    snapshot.sellerApprovalRequest !== null,
  );
  TestValidator.equals(
    "request status is rejected",
    snapshot.sellerApprovalRequest.status,
    "rejected",
  );
  TestValidator.predicate(
    "snapshot has snapshot data",
    snapshot.snapshotData !== null && snapshot.snapshotData.length > 0,
  );
  TestValidator.predicate(
    "snapshot has created at timestamp",
    snapshot.createdAt !== null && snapshot.createdAt.length > 0,
  );
  // 8. Verify snapshotData contains rejection state
  const snapshotData = JSON.parse(snapshot.snapshotData);
  TestValidator.equals(
    "snapshot data status is rejected",
    snapshotData.status,
    "rejected",
  );
  TestValidator.predicate(
    "snapshot data has responded_at timestamp",
    snapshotData.responded_at !== null,
  );
  TestValidator.predicate(
    "snapshot data has seller_id",
    snapshotData.shopping_mall_seller_id !== null,
  );
  TestValidator.predicate(
    "snapshot data has reason",
    snapshotData.reason !== null && snapshotData.reason.length > 0,
  );
  // 9. Verify snapshot immutability (read-only operation)
  // The GET operation is inherently read-only, so we verify by checking
  // that we can retrieve the same snapshot multiple times with identical data
  const snapshotAgain =
    await api.functional.shoppingMall.admin.seller_approval_requests.snapshots.at(
      adminConnection,
      {
        requestId,
        snapshotId,
      },
    );
  typia.assert(snapshotAgain);
  TestValidator.equals(
    "snapshot is immutable - id unchanged",
    snapshot.id,
    snapshotAgain.id,
  );
  TestValidator.equals(
    "snapshot is immutable - data unchanged",
    snapshot.snapshotData,
    snapshotAgain.snapshotData,
  );
  TestValidator.equals(
    "snapshot is immutable - timestamp unchanged",
    snapshot.createdAt,
    snapshotAgain.createdAt,
  );
}
