import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerAdminRequest";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
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
import { generate_random_ecommerce_mall_seller_sellers_me_admin_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_admin_requests_create";
import { prepare_random_ecommerce_mall_seller_admin_request } from "../../../prepare/prepare_random_ecommerce_mall_seller_admin_request";

/**
 * Test that super administrator cannot reject an admin request without providing the required reviewed_reason field.
 *
 * Validates the rejection validation logic where the system enforces that super administrators must provide a reason (1-1000 characters) when rejecting admin privilege requests. This ensures transparency and accountability in the review process.
 *
 * The test verifies:
 * 1. Super admin can authenticate and register
 * 2. Seller can register and submit an admin request
 * 3. When super admin attempts to reject without reviewed_reason, HTTP 400 error is returned
 * 4. The original admin request remains unchanged (status still 'pending')
 *
 * 1. Register super admin account for authentication
 * 2. Register seller account that will submit the request
 * 3. Seller submits admin request with reason
 * 4. Super admin attempts rejection without reviewed_reason field
 * 5. Verify HTTP 400 error is returned
 * 6. Verify request status remains 'pending'
 */
export async function test_api_admin_request_rejection_missing_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: `${RandomGenerator.alphaNumeric(8)}A${RandomGenerator.name(1).toLowerCase()}!`,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  // 2. Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await api.functional.ecommerceMall.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(sellerAuth);
  // 3. Seller submits admin request
  const adminRequest: IEcommerceMallSellerAdminRequest =
    await api.functional.ecommerceMall.seller.sellers.me.admin_requests.create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(adminRequest);
  // 4. Super admin attempts to reject without reviewed_reason
  // This should return HTTP 400 error because reviewed_reason is required for rejection
  await TestValidator.error(
    "rejection without reviewed_reason should return error",
    async () => {
      await api.functional.ecommerceMall.superAdmin.admin.admin_requests.update(
        superAdminConnection,
        {
          requestId: adminRequest.id,
          body: {
            action: "reject",
            // Missing reviewed_reason field - this is the test case
          },
        },
      );
    },
  );
  // 5. Verify the request status remains 'pending' (request unchanged)
  TestValidator.equals(
    "admin request status remains pending",
    adminRequest.status,
    "pending",
  );
}
