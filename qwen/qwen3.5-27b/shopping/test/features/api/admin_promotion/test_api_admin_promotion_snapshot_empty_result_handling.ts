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
 * Test handling of edge cases for admin promotion request snapshots endpoint.
 *
 * 1. Register super administrator and regular administrator accounts
 * 2. Regular admin submits a promotion request (no snapshot created yet)
 * 3. Super admin queries snapshots for pending request (expect empty array)
 * 4. Super admin queries snapshots with invalid requestId (expect 404 error)
 * 5. Verify proper error handling and response format consistency
 */
export async function test_api_admin_promotion_snapshot_empty_result_handling(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superAdminConnection, {
    body: {
      email: "superadmin@test.com",
      password: "1234",
      href: "https://test.com/admin",
      referrer: "https://test.com",
      ip: "127.0.0.1",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Register regular administrator
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await authorize_admin_join(regularAdminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com/admin",
      referrer: "https://test.com",
      ip: "127.0.0.1",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(regularAdmin);
  // 3. Regular admin submits promotion request (no snapshot created yet)
  const promotionRequest =
    await api.functional.shoppingMall.admin.adminPromotionRequests.create(
      regularAdminConnection,
      {
        body: {
          reason: "I need super admin privileges to manage the platform",
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(promotionRequest);
  TestValidator.equals(
    "promotion request status is pending",
    promotionRequest.status,
    "pending",
  );
  // 4. Super admin queries snapshots for pending request (expect empty array)
  const emptySnapshots =
    await api.functional.shoppingMall.admin.adminPromotionRequests.snapshots.index(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAdminPromotionSnapshot.IRequest,
      },
    );
  typia.assert(emptySnapshots);
  TestValidator.equals(
    "empty snapshots data array",
    emptySnapshots.data.length,
    0,
  );
  TestValidator.equals(
    "empty snapshots pagination records",
    emptySnapshots.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty snapshots pagination pages",
    emptySnapshots.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty snapshots current page",
    emptySnapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty snapshots limit",
    emptySnapshots.pagination.limit,
    10,
  );
  // 5. Super admin queries snapshots with invalid requestId (expect 404 error)
  await TestValidator.httpError(
    "invalid requestId returns 404",
    404,
    async () =>
      await api.functional.shoppingMall.admin.adminPromotionRequests.snapshots.index(
        superAdminConnection,
        {
          requestId: "00000000-0000-0000-0000-000000000000" as string &
            tags.Format<"uuid">,
          body: {
            page: 1,
            limit: 10,
          } satisfies IShoppingMallAdminPromotionSnapshot.IRequest,
        },
      ),
  );
}
