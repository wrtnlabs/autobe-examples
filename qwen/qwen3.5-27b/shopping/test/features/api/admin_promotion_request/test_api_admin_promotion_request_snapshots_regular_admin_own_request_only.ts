import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminPromotionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminPromotionSnapshot";
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
 * Test that a regular administrator can only retrieve snapshots for their own promotion request, not for others.
 *
 * Setup: Create two regular admin accounts (admin A and admin B), have admin A submit a promotion request and have admin B submit a separate promotion request.
 *
 * Test steps:
 * 1. Authenticate as admin A (regular admin)
 * 2. Call snapshots endpoint with admin A's own request ID
 * 3. Verify admin A can successfully retrieve their own snapshots
 * 4. Call snapshots endpoint with admin B's request ID
 * 5. Verify admin A receives 403 Forbidden error when trying to view admin B's snapshots
 *
 * Expected: Regular admins can only view snapshots for their own promotion requests. Attempting to view another admin's snapshots should be rejected with proper authorization error.
 */
export async function test_api_admin_promotion_request_snapshots_regular_admin_own_request_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create admin A account and authenticate
  const adminAConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Setup: Create admin B account and authenticate
  const adminBConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 3. Setup: Admin A submits a promotion request
  const adminAPromotionRequest =
    await generate_random_shopping_mall_admin_admin_promotion_requests_create(
      adminAConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(adminAPromotionRequest);
  // 4. Setup: Admin B submits a promotion request
  const adminBPromotionRequest =
    await generate_random_shopping_mall_admin_admin_promotion_requests_create(
      adminBConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(adminBPromotionRequest);
  // 5. Test: Admin A retrieves their own snapshots - should succeed
  const ownSnapshots =
    await api.functional.shoppingMall.admin.admin_promotion_requests.snapshots.index(
      adminAConnection,
      {
        requestId: adminAPromotionRequest.id,
        body: {} satisfies IShoppingMallAdminPromotionSnapshot.IRequest,
      },
    );
  typia.assert(ownSnapshots);
  TestValidator.predicate(
    "admin A can access own snapshots",
    ownSnapshots.pagination.records >= 0,
  );
  // 6. Test: Admin A tries to access admin B's snapshots - should fail with 403
  await TestValidator.httpError(
    "admin A cannot access admin B's snapshots",
    403,
    async () =>
      await api.functional.shoppingMall.admin.admin_promotion_requests.snapshots.index(
        adminAConnection,
        {
          requestId: adminBPromotionRequest.id,
          body: {} satisfies IShoppingMallAdminPromotionSnapshot.IRequest,
        },
      ),
  );
}
