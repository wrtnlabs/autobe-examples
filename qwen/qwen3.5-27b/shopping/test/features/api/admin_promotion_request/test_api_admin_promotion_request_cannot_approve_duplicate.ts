import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
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
 * Test that duplicate approval attempts on admin promotion requests are properly rejected.
 *
 * This test verifies that:
 * 1. A promotion request can be approved once successfully
 * 2. Attempting to approve an already-approved request fails
 * 3. Attempting to approve a non-existent request fails
 */
export async function test_api_admin_promotion_request_cannot_approve_duplicate(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(superAdminConnection, {
    body: {
      email: "superadmin@test.com",
      password: "1234",
      href: "https://test.com/admin/join",
      referrer: "https://test.com/admin",
      ip: "127.0.0.1",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create regular administrator connection
  const regularAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(regularAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://test.com/admin/join",
      referrer: "https://test.com/admin",
      ip: "127.0.0.1",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 3. Regular admin submits a promotion request
  const promotionRequest =
    await generate_random_shopping_mall_admin_admin_promotion_requests_create(
      regularAdminConnection,
      {},
    );
  typia.assert(promotionRequest);
  // 4. Super admin approves the request (first approval - should succeed)
  const approvedRequest =
    await api.functional.shoppingMall.admin.adminPromotionRequests.approveOrReject(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          action: "approve",
        } satisfies IShoppingMallAdminPromotionRequest.IApproveOrReject,
      },
    );
  typia.assert(approvedRequest);
  // Validate that the request was approved
  TestValidator.equals(
    "request status is approved",
    approvedRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "responded_at is set",
    approvedRequest.responded_at !== null,
  );
  // 5. Super admin attempts to approve the same request again (should fail)
  await TestValidator.error(
    "cannot approve already approved request",
    async () => {
      await api.functional.shoppingMall.admin.adminPromotionRequests.approveOrReject(
        superAdminConnection,
        {
          requestId: promotionRequest.id,
          body: {
            action: "approve",
          } satisfies IShoppingMallAdminPromotionRequest.IApproveOrReject,
        },
      );
    },
  );
  // 6. Super admin attempts to approve a non-existent request (should fail)
  const nonExistentRequestId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("cannot approve non-existent request", async () => {
    await api.functional.shoppingMall.admin.adminPromotionRequests.approveOrReject(
      superAdminConnection,
      {
        requestId: nonExistentRequestId,
        body: {
          action: "approve",
        } satisfies IShoppingMallAdminPromotionRequest.IApproveOrReject,
      },
    );
  });
}
