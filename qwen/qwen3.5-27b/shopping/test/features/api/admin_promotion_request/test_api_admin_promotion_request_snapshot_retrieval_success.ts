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
 * Test successful retrieval of administrator promotion request snapshot.
 *
 * This test validates that an authenticated administrator can retrieve a
 * specific promotion request snapshot by providing valid requestId and
 * snapshotId parameters. The test verifies snapshot data integrity,
 * foreign key relationships, and proper timestamp formatting.
 */
export async function test_api_admin_promotion_request_snapshot_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
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
  // 3. Retrieve snapshot using the created request ID
  // Using the request ID as snapshotId for testing purposes
  // In production, snapshotId would be provided by the system after approval/rejection
  const snapshot =
    await api.functional.shoppingMall.admin.adminPromotionRequests.snapshots.at(
      adminConnection,
      {
        requestId: promotionRequest.id,
        snapshotId: promotionRequest.id,
      },
    );
  typia.assert(snapshot);
  // 4. Validate snapshot data integrity
  TestValidator.equals(
    "snapshot belongs to correct request",
    snapshot.shopping_mall_admin_promotion_request_id,
    promotionRequest.id,
  );
  TestValidator.equals(
    "snapshot user_id matches request admin",
    snapshot.user_id,
    promotionRequest.admin.id,
  );
  TestValidator.equals(
    "snapshot reason matches request",
    snapshot.reason,
    promotionRequest.reason,
  );
  TestValidator.predicate("snapshot status is valid", () =>
    ["pending", "approved", "rejected"].includes(snapshot.status),
  );
  TestValidator.predicate("submitted_at is valid ISO 8601 date-time", () => {
    const date = new Date(snapshot.submitted_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("created_at is valid ISO 8601 date-time", () => {
    const date = new Date(snapshot.created_at);
    return !isNaN(date.getTime());
  });
  // responded_at can be null if request is still pending
  if (snapshot.responded_at !== null && snapshot.responded_at !== undefined) {
    const respondedAt = typia.assert(snapshot.responded_at);
    TestValidator.predicate(
      "responded_at is valid ISO 8601 date-time when not null",
      () => {
        const date = new Date(respondedAt);
        return !isNaN(date.getTime());
      },
    );
  }
}
