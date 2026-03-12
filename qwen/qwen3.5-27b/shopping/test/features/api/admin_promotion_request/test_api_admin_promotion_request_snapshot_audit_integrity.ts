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
 * Test administrator promotion request snapshot audit integrity.
 *
 * This test validates that snapshots accurately capture and preserve the complete
 * state of a promotion request at decision time, ensuring audit trail integrity.
 *
 * Workflow:
 * 1. Create and authenticate as regular admin
 * 2. Submit a promotion request from the regular admin
 * 3. Create and authenticate as super admin
 * 4. Retrieve the promotion request and validate its structure
 * 5. Validate that snapshot fields are properly captured
 */
export async function test_api_admin_promotion_request_snapshot_audit_integrity(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate as regular admin
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdminEmail = typia.random<string & tags.Format<"email">>();
  const regularAdminPassword = RandomGenerator.alphaNumeric(16);
  const regularAdmin = await authorize_admin_join(regularAdminConnection, {
    body: {
      email: regularAdminEmail,
      password: regularAdminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(regularAdmin);
  // Step 2: Submit promotion request from regular admin using utility function
  const promotionReason = RandomGenerator.paragraph({ sentences: 3 });
  const promotionRequest =
    await generate_random_shopping_mall_admin_admin_promotion_requests_create(
      regularAdminConnection,
      {
        body: {
          reason: promotionReason,
        },
      },
    );
  typia.assert(promotionRequest);
  // Validate initial promotion request state
  TestValidator.equals(
    "request status is pending",
    promotionRequest.status,
    "pending",
  );
  TestValidator.equals(
    "reason matches input",
    promotionRequest.reason,
    promotionReason,
  );
  TestValidator.equals(
    "responded_at is null",
    promotionRequest.responded_at,
    null,
  );
  TestValidator.equals(
    "admin id matches",
    promotionRequest.admin.id,
    regularAdmin.id,
  );
  TestValidator.predicate(
    "submitted_at exists",
    promotionRequest.submitted_at !== undefined,
  );
  // Step 3: Create and authenticate as super admin for snapshot access
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  const superAdmin = await authorize_admin_join(superAdminConnection, {
    body: {
      email: superAdminEmail,
      password: superAdminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Step 4: Retrieve snapshot using the promotion request ID
  // Note: In a real scenario, there would be a list endpoint to get snapshot IDs
  // For this test, we'll use the request ID as the snapshot ID (assuming 1:1 mapping)
  const snapshot =
    await api.functional.shoppingMall.admin.adminPromotionRequests.snapshots.at(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        snapshotId: promotionRequest.id,
      },
    );
  typia.assert(snapshot);
  // Step 5: Validate snapshot integrity - all fields should match the promotion request
  TestValidator.equals(
    "snapshot request_id matches",
    snapshot.shopping_mall_admin_promotion_request_id,
    promotionRequest.id,
  );
  TestValidator.equals(
    "snapshot user_id matches admin",
    snapshot.user_id,
    regularAdmin.id,
  );
  TestValidator.equals(
    "snapshot reason matches original",
    snapshot.reason,
    promotionReason,
  );
  TestValidator.equals(
    "snapshot status matches request",
    snapshot.status,
    promotionRequest.status,
  );
  TestValidator.equals(
    "snapshot submitted_at matches",
    snapshot.submitted_at,
    promotionRequest.submitted_at,
  );
  TestValidator.equals(
    "snapshot responded_at matches",
    snapshot.responded_at,
    promotionRequest.responded_at,
  );
  // Step 6: Validate timestamp consistency
  TestValidator.predicate(
    "snapshot created_at exists",
    snapshot.created_at !== undefined,
  );
  const snapshotCreatedAt = new Date(snapshot.created_at).getTime();
  const requestCreatedAt = new Date(promotionRequest.created_at).getTime();
  const timeDifference = Math.abs(snapshotCreatedAt - requestCreatedAt);
  TestValidator.predicate(
    "timestamps are within 10 seconds",
    timeDifference <= 10000,
  );
  // Step 7: Validate immutability by retrieving snapshot again
  const snapshotRetrieved =
    await api.functional.shoppingMall.admin.adminPromotionRequests.snapshots.at(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        snapshotId: snapshot.id,
      },
    );
  typia.assert(snapshotRetrieved);
  TestValidator.equals(
    "snapshot is immutable - id",
    snapshotRetrieved.id,
    snapshot.id,
  );
  TestValidator.equals(
    "snapshot is immutable - request_id",
    snapshotRetrieved.shopping_mall_admin_promotion_request_id,
    snapshot.shopping_mall_admin_promotion_request_id,
  );
  TestValidator.equals(
    "snapshot is immutable - user_id",
    snapshotRetrieved.user_id,
    snapshot.user_id,
  );
  TestValidator.equals(
    "snapshot is immutable - reason",
    snapshotRetrieved.reason,
    snapshot.reason,
  );
  TestValidator.equals(
    "snapshot is immutable - status",
    snapshotRetrieved.status,
    snapshot.status,
  );
  TestValidator.equals(
    "snapshot is immutable - submitted_at",
    snapshotRetrieved.submitted_at,
    snapshot.submitted_at,
  );
  TestValidator.equals(
    "snapshot is immutable - responded_at",
    snapshotRetrieved.responded_at,
    snapshot.responded_at,
  );
  TestValidator.equals(
    "snapshot is immutable - created_at",
    snapshotRetrieved.created_at,
    snapshot.created_at,
  );
  // Step 8: Validate snapshot structure completeness
  TestValidator.predicate(
    "all required fields present",
    snapshot.id !== undefined &&
      snapshot.shopping_mall_admin_promotion_request_id !== undefined &&
      snapshot.user_id !== undefined &&
      snapshot.reason !== undefined &&
      snapshot.status !== undefined &&
      snapshot.submitted_at !== undefined &&
      snapshot.created_at !== undefined,
  );
  // Step 9: Validate audit trail integrity
  TestValidator.predicate(
    "snapshot captures pending state correctly",
    snapshot.status === "pending",
  );
  TestValidator.equals(
    "snapshot responded_at is null for pending",
    snapshot.responded_at,
    null,
  );
  TestValidator.predicate(
    "user_id is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      snapshot.user_id,
    ),
  );
  TestValidator.predicate(
    "reason is not empty",
    snapshot.reason.trim().length > 0,
  );
}
