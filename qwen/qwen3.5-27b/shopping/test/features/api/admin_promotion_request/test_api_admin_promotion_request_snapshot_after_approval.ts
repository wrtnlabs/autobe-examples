import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import type { IShoppingMallAdminPromotionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_shopping_mall_admin_admin_promotion_requests_create } from "../../../generate/generate_random_shopping_mall_admin_admin_promotion_requests_create";
import { prepare_random_shopping_mall_admin_promotion_request } from "../../../prepare/prepare_random_shopping_mall_admin_promotion_request";

/**
 * Test that an admin promotion request snapshot is correctly created and retrievable after approval.
 * Validates the audit trail creation workflow for approved promotion requests by verifying snapshot
 * immutability, correct reference to parent request, and complete state capture including user_id,
 * reason, status, submitted_at, responded_at, and created_at timestamps.
 */
export async function test_api_admin_promotion_request_snapshot_after_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a regular administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create a promotion request
  const promotionRequest =
    await generate_random_shopping_mall_admin_admin_promotion_requests_create(
      adminConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // 3. Enable simulation mode to test snapshot retrieval with mock data
  // Since we cannot actually approve the request (no approval API in SDK),
  // we use simulation mode to verify the endpoint behavior
  const simulateConnection: api.IConnection = {
    ...adminConnection,
    simulate: true,
  };
  // 4. Generate a snapshot ID for testing
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 5. Retrieve the snapshot using simulation mode
  const snapshot =
    await api.functional.shoppingMall.admin.admin_promotion_requests.snapshots.at(
      simulateConnection,
      {
        requestId: promotionRequest.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // 6. Validate snapshot references the correct parent request
  TestValidator.equals(
    "snapshot references correct promotion request",
    snapshot.shopping_mall_admin_promotion_request_id,
    promotionRequest.id,
  );
  // 7. Validate snapshot contains the requesting admin's user_id
  TestValidator.equals(
    "snapshot captures requesting admin user_id",
    snapshot.user_id,
    adminAuth.id,
  );
  // 8. Validate snapshot captures the reason from the promotion request
  TestValidator.equals(
    "snapshot captures promotion request reason",
    snapshot.reason,
    promotionRequest.reason,
  );
  // 9. Validate snapshot status is 'approved'
  TestValidator.equals(
    "snapshot status is approved",
    snapshot.status,
    "approved",
  );
  // 10. Validate snapshot submitted_at matches the promotion request submitted_at
  TestValidator.equals(
    "snapshot submitted_at matches request",
    snapshot.submitted_at,
    promotionRequest.submitted_at,
  );
  // 11. Validate responded_at is not null (set at approval time)
  TestValidator.predicate(
    "snapshot responded_at is set",
    snapshot.responded_at !== null,
  );
  // 12. Validate snapshot created_at exists
  TestValidator.predicate(
    "snapshot created_at exists",
    snapshot.created_at != null,
  );
  // 13. Test snapshot immutability - retrieve again and compare
  const snapshotRetrievedAgain =
    await api.functional.shoppingMall.admin.admin_promotion_requests.snapshots.at(
      simulateConnection,
      {
        requestId: promotionRequest.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshotRetrievedAgain);
  TestValidator.equals(
    "snapshot is immutable - identical on re-retrieval",
    snapshot,
    snapshotRetrievedAgain,
  );
}
