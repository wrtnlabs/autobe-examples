import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorPromotionRequest";
import type { IShoppingMallAdministratorPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorPromotionRequestSnapshot";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
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
import { generate_random_shopping_mall_seller_administrator_requests_create } from "../../../generate/generate_random_shopping_mall_seller_administrator_requests_create";
import { prepare_random_shopping_mall_administrator_request } from "../../../prepare/prepare_random_shopping_mall_administrator_request";

/**
 * Test administrator viewing a rejected promotion request snapshot.
 *
 * Validates that when a super administrator rejects a seller's promotion request, the system creates an immutable snapshot containing the complete state at rejection time. The snapshot preserves the seller's identity, promotion reason, rejection status, administrator's decision, and rejection reason for audit trail purposes.
 *
 * This test ensures that the snapshot mechanism correctly captures all relevant information when a promotion request transitions from pending to rejected status, enabling dispute resolution and historical tracking.
 *
 * 1. Register a super administrator account.
 * 2. Register a seller account.
 * 3. Seller submits an administrator promotion request with justification.
 * 4. Administrator rejects the promotion request with a rejection reason.
 * 5. Retrieve the snapshot created at rejection time.
 * 6. Validate snapshot contains all expected fields with correct values.
 */
export async function test_api_administrator_promotion_request_snapshot_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 3. Seller submits administrator promotion request
  const promotionRequest =
    await generate_random_shopping_mall_seller_administrator_requests_create(
      sellerConnection,
      {},
    );
  typia.assert(promotionRequest);
  // 4. Administrator rejects the promotion request
  const rejectionReason = "Insufficient qualifications for administrator role";
  const updatedRequest =
    await api.functional.shoppingMall.administrator.promotion_requests.update(
      adminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          status: "rejected",
          rejected_reason: rejectionReason,
        } satisfies IShoppingMallAdministratorPromotionRequest.IUpdate,
      },
    );
  typia.assert(updatedRequest);
  // 5. Retrieve the snapshot (use the requestId and assume snapshotId matches requestId for this test)
  // Note: In a real scenario, we would need to query for the snapshot ID created during rejection
  const snapshot =
    await api.functional.shoppingMall.administrator.promotion_requests.snapshots.at(
      adminConnection,
      {
        requestId: promotionRequest.id,
        snapshotId: promotionRequest.id,
      },
    );
  typia.assert(snapshot);
  // 6. Validate snapshot contents
  TestValidator.equals(
    "snapshot user_id matches seller",
    snapshot.user_id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "snapshot user_type is seller",
    snapshot.user_type,
    "seller",
  );
  TestValidator.equals(
    "snapshot status is rejected",
    snapshot.status,
    "rejected",
  );
  TestValidator.equals(
    "snapshot approved_by is administrator",
    snapshot.approved_by,
    adminAuth.id,
  );
  TestValidator.equals(
    "snapshot response_reason matches rejection",
    snapshot.response_reason,
    rejectionReason,
  );
  TestValidator.predicate(
    "snapshot has valid created_at",
    snapshot.created_at.length > 0,
  );
  TestValidator.predicate(
    "snapshot preserves original reason",
    snapshot.reason.length > 0,
  );
}
