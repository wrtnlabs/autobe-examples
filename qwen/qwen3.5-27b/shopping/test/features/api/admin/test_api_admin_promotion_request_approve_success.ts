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
 * Test the successful approval of a pending administrator promotion request by a super administrator.
 *
 * This test verifies that a super administrator can approve a promotion request
 * submitted by a regular administrator, granting them elevated privileges.
 */
export async function test_api_admin_promotion_request_approve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(superAdminConnection, {
    body: {
      email: "superadmin@test.com",
      password: "12345678",
      href: "https://example.com/admin/join",
      referrer: "https://example.com",
      ip: "192.168.1.1",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create regular administrator connection
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdminEmail = typia.random<string & tags.Format<"email">>();
  await authorize_admin_join(regularAdminConnection, {
    body: {
      email: regularAdminEmail,
      password: "12345678",
      href: "https://example.com/admin/join",
      referrer: "https://example.com",
      ip: "192.168.1.2",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 3. Submit promotion request as regular admin
  const promotionRequest =
    await generate_random_shopping_mall_admin_admin_promotion_requests_create(
      regularAdminConnection,
      {
        body: {
          reason:
            "I need super administrator privileges to manage the platform effectively and handle critical administrative tasks.",
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // 4. Verify the request status is 'pending'
  TestValidator.equals(
    "promotion request status is pending",
    promotionRequest.status,
    "pending",
  );
  TestValidator.equals(
    "responded_at is null while pending",
    promotionRequest.responded_at,
    null,
  );
  // 5. Approve the promotion request as super admin
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
  // 6. Validate the approval response
  TestValidator.equals(
    "promotion request status is approved",
    approvedRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "responded_at is set after approval",
    approvedRequest.responded_at !== null,
  );
  TestValidator.equals(
    "admin email matches",
    approvedRequest.admin.email,
    regularAdminEmail,
  );
  // 7. Verify the requesting admin can now access administrator endpoints
  // The regular admin should now have grade='regular' and status='active'
  TestValidator.equals(
    "admin status is active",
    approvedRequest.admin.status,
    "active",
  );
}
