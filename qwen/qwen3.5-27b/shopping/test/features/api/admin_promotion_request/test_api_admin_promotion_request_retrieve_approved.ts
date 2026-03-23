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
 * Test that a super administrator can retrieve details of an already-approved administrator promotion request.
 * The test verifies: (1) Super admin authenticates, (2) Regular admin creates a promotion request,
 * (3) Super admin approves the request using PUT endpoint, (4) Super admin retrieves the approved promotion request,
 * (5) Response shows status='approved' and responded_at timestamp is populated (not null).
 * Validate that the response includes the approval timestamp and the original submission details remain intact.
 */
export async function test_api_admin_promotion_request_retrieve_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super admin setup - authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(superAdminConnection, {
    body: {
      email: "superadmin@test.com",
      password: "1234",
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin",
    },
  });
  // 2. Regular admin setup - authenticate as regular administrator
  const regularAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(regularAdminConnection, {
    body: {
      email: "regularadmin@test.com",
      password: "1234",
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin",
    },
  });
  // 3. Regular admin creates a promotion request using utility function
  const promotionRequest =
    await generate_random_shopping_mall_admin_admin_promotion_requests_create(
      regularAdminConnection,
      {
        body: {
          reason:
            "I need super admin privileges to manage the platform effectively and handle critical administrative tasks.",
        },
      },
    );
  typia.assert(promotionRequest);
  // 4. Super admin approves the promotion request using PUT endpoint
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
  // 5. Super admin retrieves the approved promotion request using GET endpoint
  const retrievedRequest =
    await api.functional.shoppingMall.admin.admin_promotion_requests.getByPromotionrequestid(
      superAdminConnection,
      {
        promotionRequestId: promotionRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 6. Validate that status is 'approved'
  TestValidator.equals(
    "status is approved",
    retrievedRequest.status,
    "approved",
  );
  // 7. Validate that responded_at is not null (timestamp populated)
  TestValidator.predicate(
    "responded_at is populated",
    retrievedRequest.responded_at !== null,
  );
  // 8. Validate that original submission details remain intact
  TestValidator.equals(
    "reason matches original",
    retrievedRequest.reason,
    promotionRequest.reason,
  );
  TestValidator.equals(
    "submitted_at matches original",
    retrievedRequest.submitted_at,
    promotionRequest.submitted_at,
  );
  TestValidator.equals(
    "admin id matches original",
    retrievedRequest.admin.id,
    promotionRequest.admin.id,
  );
  TestValidator.equals(
    "admin email matches original",
    retrievedRequest.admin.email,
    promotionRequest.admin.email,
  );
}
