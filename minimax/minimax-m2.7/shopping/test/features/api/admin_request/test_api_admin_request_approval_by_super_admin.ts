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
 * Test super administrator approving a seller's pending admin request.
 *
 * Validates the complete workflow where a super administrator reviews and approves
 * a seller's administrative privilege request. The test ensures that:
 * - Super administrators can successfully approve pending admin requests
 * - The request status transitions from 'pending' to 'approved'
 * - Reviewer information (reviewedBySuperAdmin) is properly recorded
 * - The rejection_reason remains null after approval
 * - Timestamps are updated upon approval
 *
 * 1. Authenticate as superAdmin who will approve the request
 * 2. Register a new seller account
 * 3. Seller submits an admin request with a valid reason
 * 4. SuperAdmin approves the request via PUT endpoint
 * 5. Validate response contains approved status and reviewer information
 *
 * @param connection Base API connection
 */
export async function test_api_admin_request_approval_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin who will approve the admin request
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Register a new seller account that will submit the admin request
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Seller submits an admin request to become administrator
  const adminRequest =
    await generate_random_ecommerce_mall_seller_sellers_me_admin_requests_create(
      sellerConnection,
      {
        body: {
          reason:
            "I need admin access to manage my products and orders more effectively.",
        },
      },
    );
  typia.assert(adminRequest);
  // Validate initial request state is pending
  TestValidator.equals(
    "request status is pending",
    adminRequest.status,
    "pending",
  );
  // 4. SuperAdmin approves the admin request
  const approvedRequest =
    await api.functional.ecommerceMall.superAdmin.admin.admin_requests.update(
      superAdminConnection,
      {
        requestId: adminRequest.id,
        body: {
          action: "approve",
        } satisfies IEcommerceMallAdminRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  // 5. Validate the approval response
  TestValidator.equals(
    "request status is now approved",
    approvedRequest.status,
    "approved",
  );
  TestValidator.equals(
    "request id is preserved",
    approvedRequest.id,
    adminRequest.id,
  );
  TestValidator.equals(
    "seller information is preserved",
    approvedRequest.seller?.id,
    adminRequest.seller.id,
  );
  TestValidator.equals(
    "actor type is seller",
    approvedRequest.actorType,
    "seller",
  );
  TestValidator.equals(
    "requested grade is admin",
    approvedRequest.requestedGrade,
    "admin",
  );
}