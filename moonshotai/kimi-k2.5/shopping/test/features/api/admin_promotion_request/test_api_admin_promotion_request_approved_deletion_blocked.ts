import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_seller_admin_promotion_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_admin_promotion_requests_create";
import { prepare_random_ecommerce_mall_admin_promotion_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_promotion_request";

/**
 * Test that approved administrator promotion requests cannot be deleted (preserved for audit purposes).
 *
 * Business Context: Once a promotion request is approved, the user has been granted administrator status.
 * Deleting approved requests would break audit trails and allow bypassing system controls.
 *
 * Test Steps:
 * 1. Authenticate as a seller using POST /ecommerceMall/auth/seller/join
 * 2. Create a pending admin promotion request using POST /ecommerceMall/seller/admin-promotion-requests
 * 3. Authenticate as a superAdmin using POST /ecommerceMall/auth/superAdmin/join
 * 4. Approve the promotion request using PUT /ecommerceMall/superAdmin/admin-promotion-requests/{requestId}
 * 5. Re-authenticate as the original seller using POST /ecommerceMall/auth/seller/login
 * 6. Attempt to delete the approved promotion request using DELETE /ecommerceMall/seller/admin-promotion-requests/{requestId}
 *
 * Expected Outcomes:
 * - DELETE request is rejected for approved requests
 * - Error response indicates the request is approved and cannot be deleted
 * - Database record remains unchanged (no deleted_at timestamp)
 * - Administrator privileges already granted remain intact
 * - The audit trail of the approval decision is preserved
 */
export async function test_api_admin_promotion_request_approved_deletion_blocked(
  connection: api.IConnection,
): Promise<void> {
  // Store seller credentials for later re-authentication
  const sellerCredentials: IEcommerceMallSeller.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  // Step 1: Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: sellerCredentials,
  });
  typia.assert(sellerAuth);
  // Step 2: Create a pending admin promotion request
  const promotionRequest =
    await generate_random_ecommerce_mall_seller_admin_promotion_requests_create(
      sellerConnection,
      {
        body: {
          reason: `I want to become an administrator to help manage the platform. I have ${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>()} years of relevant experience and am committed to maintaining platform standards.`,
        },
      },
    );
  typia.assert(promotionRequest);
  // Verify the request was created with pending status
  TestValidator.equals(
    "request status should be pending",
    promotionRequest.status,
    "pending",
  );
  // Step 3: Create superAdmin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    },
  );
  typia.assert(superAdminAuth);
  // Step 4: Approve the promotion request
  const approvedRequest =
    await api.functional.ecommerceMall.superAdmin.admin_promotion_requests.update(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          status: "approved",
        } satisfies IEcommerceMallAdminPromotionRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  // Verify the request status is now approved
  TestValidator.equals(
    "request status should be approved",
    approvedRequest.status,
    "approved",
  );
  // Step 5: Re-authenticate as the original seller using login
  const sellerReauthConnection: api.IConnection = { host: connection.host };
  const sellerReauth = await authorize_seller_login(sellerReauthConnection, {
    body: {
      email: sellerCredentials.email,
      password: sellerCredentials.password,
    },
  });
  typia.assert(sellerReauth);
  // Step 6: Attempt to delete the approved promotion request - should fail
  await TestValidator.error(
    "deletion of approved promotion request should be blocked",
    async () => {
      await api.functional.ecommerceMall.seller.admin_promotion_requests.erase(
        sellerReauthConnection,
        {
          requestId: promotionRequest.id,
        },
      );
    },
  );
}
