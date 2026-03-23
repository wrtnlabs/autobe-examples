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
 * Test that a super administrator can retrieve audit snapshots for any administrator promotion request.
 *
 * 1. Register a super administrator account
 * 2. Register a regular administrator account
 * 3. Regular admin submits a promotion request
 * 4. Super admin retrieves snapshots for the promotion request
 * 5. Validate snapshot data and pagination
 */
export async function test_api_admin_promotion_snapshot_retrieve_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(superAdminConnection, {
    body: {
      email: "superadmin@test.com",
      password: "1234",
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin",
      ip: "127.0.0.1",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Register regular administrator
  const regularAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(regularAdminConnection, {
    body: {
      email: "regularadmin@test.com",
      password: "1234",
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin",
      ip: "127.0.0.1",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 3. Regular admin submits promotion request
  const promotionRequest =
    await generate_random_shopping_mall_admin_admin_promotion_requests_create(
      regularAdminConnection,
      {
        body: {
          reason:
            "I need super admin privileges to manage other administrators and oversee platform operations.",
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // 4. Super admin retrieves snapshots for the promotion request
  const snapshots =
    await api.functional.shoppingMall.admin.adminPromotionRequests.snapshots.index(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallAdminPromotionSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 5. Validate pagination metadata
  TestValidator.equals("current page", snapshots.pagination.current, 1);
  TestValidator.equals("page limit", snapshots.pagination.limit, 20);
  TestValidator.predicate("has snapshots", snapshots.pagination.records >= 1);
  TestValidator.predicate("has pages", snapshots.pagination.pages >= 1);
  // 6. Validate snapshot data
  TestValidator.predicate("data array not empty", snapshots.data.length >= 1);
  // Get the first snapshot
  const snapshot = snapshots.data[0];
  // Validate snapshot fields
  TestValidator.predicate(
    "snapshot has valid reason",
    snapshot.reason.length > 0,
  );
  TestValidator.predicate(
    "snapshot has status",
    ["pending", "approved", "rejected"].includes(snapshot.status),
  );
  TestValidator.predicate(
    "snapshot has submitted_at",
    snapshot.submitted_at !== undefined,
  );
  TestValidator.predicate(
    "snapshot has created_at",
    snapshot.created_at !== undefined,
  );
  // Validate user information in snapshot
  TestValidator.equals(
    "user id matches",
    snapshot.user.id,
    promotionRequest.admin.id,
  );
  TestValidator.equals(
    "user email matches",
    snapshot.user.email,
    promotionRequest.admin.email,
  );
  TestValidator.predicate("user has grade", snapshot.user.grade !== undefined);
  TestValidator.predicate(
    "user has status",
    snapshot.user.status !== undefined,
  );
}
