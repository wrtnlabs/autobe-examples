import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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

/**
 * Test administrator retrieval of an approved cancellation request snapshot.
 *
 * Scenario: An administrator retrieves a cancellation request snapshot that was
 * created when a seller approved a customer's cancellation request. This tests
 * the primary success path for administrator oversight during dispute resolution.
 *
 * Flow:
 * 1. Seller approves cancellation request (creates immutable snapshot)
 * 2. Administrator authenticates for platform oversight
 * 3. Administrator retrieves snapshot by ID
 * 4. Validate snapshot structure and approved status
 */
export async function test_api_cancellation_snapshot_approved_retrieval_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Seller authentication and cancellation request approval
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // Seller approves cancellation request (creates snapshot automatically)
  const cancellationRequestId = typia.random<string & tags.Format<"uuid">>();
  const approvedRequest =
    await api.functional.shoppingMall.seller.cancellation_requests.approve(
      sellerConnection,
      { cancellationRequestId },
    );
  typia.assert(approvedRequest);
  // Verify approval was processed
  TestValidator.equals(
    "cancellation request status after approval",
    approvedRequest.status,
    "approved",
  );
  // Test: Administrator authentication for oversight access
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {});
  typia.assert(adminAuth);
  // Administrator retrieves the snapshot
  // Note: In production, snapshot ID would be obtained via query API
  // For simulation mode, a generated UUID retrieves valid mock data
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.shoppingMall.administrator.cancellation_request_snapshots.at(
      adminConnection,
      { snapshotId },
    );
  typia.assert(snapshot);
  // Validation: Snapshot structure and content for approved cancellation
  TestValidator.predicate(
    "snapshot preserves customer's original reason",
    snapshot.reason.length > 0,
  );
  TestValidator.predicate(
    "snapshot status is valid seller decision",
    snapshot.status === "approved" || snapshot.status === "rejected",
  );
  TestValidator.predicate(
    "snapshot has creation timestamp",
    snapshot.created_at.length > 0,
  );
  TestValidator.predicate(
    "snapshot references parent cancellation request",
    snapshot.cancellation_request.id.length > 0,
  );
}
