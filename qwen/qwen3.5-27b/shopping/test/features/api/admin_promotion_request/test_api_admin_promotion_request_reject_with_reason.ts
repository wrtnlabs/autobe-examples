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
 * Test the successful rejection of a pending administrator promotion request by a super administrator with a rejection reason.
 *
 * 1. Create a super administrator account
 * 2. Create a regular administrator account
 * 3. As the regular admin, submit a promotion request
 * 4. As the super admin, reject the promotion request with a reason
 * 5. Validate the rejection response and audit trail
 */
export async function test_api_admin_promotion_request_reject_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(superAdminConnection, {
    body: {
      email: "super-admin@test.com",
      password: "SuperAdmin123!",
      href: "https://platform.com/admin/join",
      referrer: "https://platform.com/admin",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create regular administrator
  const regularAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(regularAdminConnection, {
    body: {
      email: "regular-admin@test.com",
      password: "RegularAdmin123!",
      href: "https://platform.com/admin/join",
      referrer: "https://platform.com/admin",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 3. Submit promotion request as regular admin
  const promotionRequest =
    await generate_random_shopping_mall_admin_admin_promotion_requests_create(
      regularAdminConnection,
      {
        body: {
          reason:
            "I have extensive experience managing e-commerce platforms and would like to help with platform administration.",
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // Verify the request is pending
  TestValidator.equals(
    "promotion request status is pending",
    promotionRequest.status,
    "pending",
  );
  TestValidator.equals(
    "promotion request responded_at is null while pending",
    promotionRequest.responded_at,
    null,
  );
  // 4. Reject the promotion request as super admin
  const rejectedRequest =
    await api.functional.shoppingMall.admin.adminPromotionRequests.approveOrReject(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          action: "reject",
          rejectionReason: "Insufficient experience with platform operations",
        } satisfies IShoppingMallAdminPromotionRequest.IApproveOrReject,
      },
    );
  typia.assert(rejectedRequest);
  // 5. Validate rejection response
  TestValidator.equals(
    "promotion request status is rejected",
    rejectedRequest.status,
    "rejected",
  );
  TestValidator.predicate(
    "responded_at is set after rejection",
    rejectedRequest.responded_at !== null,
  );
  TestValidator.equals(
    "rejection reason is preserved",
    rejectedRequest.reason,
    promotionRequest.reason,
  );
  // Verify the requesting admin can submit a new promotion request
  const newPromotionRequest =
    await generate_random_shopping_mall_admin_admin_promotion_requests_create(
      regularAdminConnection,
      {
        body: {
          reason:
            "I have gained more experience and would like to reconsider for administrator privileges.",
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(newPromotionRequest);
  TestValidator.equals(
    "new promotion request can be submitted after rejection",
    newPromotionRequest.status,
    "pending",
  );
  TestValidator.notEquals(
    "new promotion request has different ID",
    newPromotionRequest.id,
    rejectedRequest.id,
  );
}
