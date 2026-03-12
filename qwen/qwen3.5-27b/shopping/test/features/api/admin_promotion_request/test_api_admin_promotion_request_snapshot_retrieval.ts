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

export async function test_api_admin_promotion_request_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test admin promotion request snapshot retrieval functionality.
   * 1. Authenticate as administrator
   * 2. Create a promotion request (which generates snapshots)
   * 3. Retrieve the snapshot by request ID and snapshot ID
   * 4. Validate snapshot data integrity and immutability
   */
  // 1. Create admin connection and authenticate
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
  // 2. Create a promotion request (simulated environment will create snapshot)
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
  // 3. Generate a snapshot ID for retrieval
  // In simulation mode, the snapshot ID can be any valid UUID
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Retrieve the snapshot using the request ID and snapshot ID
  const snapshot =
    await api.functional.shoppingMall.admin.admin_promotion_requests.snapshots.at(
      adminConnection,
      {
        requestId: promotionRequest.id,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // 5. Validate snapshot data integrity
  TestValidator.equals(
    "snapshot request ID matches",
    snapshot.shopping_mall_admin_promotion_request_id,
    promotionRequest.id,
  );
  TestValidator.equals(
    "snapshot reason matches original request",
    snapshot.reason,
    promotionRequest.reason,
  );
  TestValidator.equals(
    "snapshot status matches request status",
    snapshot.status,
    promotionRequest.status,
  );
  TestValidator.equals(
    "snapshot submitted_at matches request submitted_at",
    snapshot.submitted_at,
    promotionRequest.submitted_at,
  );
  TestValidator.predicate(
    "snapshot has valid user_id",
    snapshot.user_id !== undefined && snapshot.user_id.length > 0,
  );
  TestValidator.predicate(
    "snapshot created_at is valid timestamp",
    snapshot.created_at !== undefined &&
      new Date(snapshot.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "snapshot responded_at is null or valid timestamp",
    snapshot.responded_at === null ||
      new Date(snapshot.responded_at).getTime() > 0,
  );
}
