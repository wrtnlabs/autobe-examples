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
 * Test super administrator rejecting a seller's pending admin request with proper review reason.
 *
 * Validates the complete rejection workflow where a super administrator reviews and rejects
 * a seller's administrative privilege request. The test ensures that:
 *
 * - The super administrator can authenticate and access admin request management endpoints
 * - A seller can submit an admin request with a justification reason
 * - The super admin can reject the request with a detailed review reason
 * - The request status transitions from 'pending' to 'rejected'
 * - The rejection reason is stored and returned in the response
 * - The reviewer (super admin) information is recorded in the request
 *
 * 1. Register a super administrator who will perform the rejection
 * 2. Register a seller who will submit the admin request
 * 3. Seller submits an admin request with a reason explaining their need for admin privileges
 * 4. Super admin rejects the request with a detailed review reason
 * 5. Validate response contains correct status, reviewer info, and rejection reason
 */
export async function test_api_admin_request_rejection_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super administrator who will reject the admin request
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Register seller who will submit the admin request
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Seller submits an admin request with a reason
  const adminRequest =
    await api.functional.ecommerceMall.seller.sellers.me.admin_requests.create(
      sellerConnection,
      {
        body: {
          reason:
            "I would like to help moderate the platform and ensure quality standards are maintained across all seller listings.",
        } satisfies IEcommerceMallSellerAdminRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  // 4. Super admin rejects the request with a detailed review reason
  const rejectionReason =
    "Insufficient qualifications for administrator role. Please gain more platform experience.";
  const updatedRequest =
    await api.functional.ecommerceMall.superAdmin.admin.admin_requests.update(
      superAdminConnection,
      {
        requestId: adminRequest.id,
        body: {
          action: "reject",
          reviewed_reason: rejectionReason,
        } satisfies IEcommerceMallAdminRequest.IUpdate,
      },
    );
  typia.assert(updatedRequest);
  // 5. Validate response contains correct status
  TestValidator.equals(
    "request status should be rejected",
    updatedRequest.status,
    "rejected",
  );
  // 6. Validate rejection reason matches input
  TestValidator.equals(
    "reviewed reason should match",
    updatedRequest.reviewedReason,
    rejectionReason,
  );
  // 7. Validate reviewer (super admin) information is recorded
  TestValidator.predicate(
    "reviewedBySuperAdmin should not be null",
    updatedRequest.reviewer !== null && updatedRequest.reviewer !== undefined,
  );
  // 8. Validate request contains proper seller information
  TestValidator.equals(
    "seller id should match original request",
    updatedRequest.seller?.id,
    adminRequest.seller.id,
  );
}
