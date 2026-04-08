import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_sellers_me_admin_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_admin_requests_create";
import { prepare_random_ecommerce_mall_seller_admin_request } from "../../../prepare/prepare_random_ecommerce_mall_seller_admin_request";

/**
 * Test the complete workflow of an approved seller successfully submitting an administrative privilege request.
 *
 * Validates the end-to-end flow where a seller registers, gets approved by an administrator, authenticates,
 * and then submits a request for elevated administrative privileges on the platform.
 *
 * The test verifies that approved sellers can successfully submit admin requests and that the request
 * is properly created with pending status awaiting super administrator review. This ensures the
 * administrative privilege escalation workflow functions correctly for the seller role.
 *
 * **Test Flow:**
 * 1. Register an admin account for seller approval authority
 * 2. Register a new seller account with pending status
 * 3. Administrator approves the seller registration
 * 4. Approved seller authenticates to obtain session tokens
 * 5. Seller submits admin request with detailed reason
 * 6. Validate response contains correct structure and pending status
 */
export async function test_api_seller_admin_request_submission_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin for seller approval
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Register a new seller with known password
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinResult = await authorize_seller_join(connection, {
    body: {
      password: sellerPassword,
    },
  });
  // 3. Admin approves the seller
  const approvedSeller =
    await api.functional.ecommerceMall.admin.admin.sellers.approve(
      adminConnection,
      {
        sellerId: sellerJoinResult.id,
      },
    );
  typia.assert(approvedSeller);
  // 4. Seller authenticates (login required for approved seller)
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoinResult.email,
      password: sellerPassword,
      href: RandomGenerator.paragraph({ sentences: 1 }),
      referrer: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 5. Submit admin request
  const adminRequest =
    await api.functional.ecommerceMall.seller.sellers.me.admin_requests.create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceMallSellerAdminRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  // 6. Validate response structure
  TestValidator.equals("status is pending", adminRequest.status, "pending");
  TestValidator.equals(
    "rejection_reason is null",
    adminRequest.rejection_reason,
    null,
  );
  TestValidator.equals(
    "seller approvalStatus is approved",
    adminRequest.seller.approvalStatus,
    "approved",
  );
  TestValidator.equals(
    "reviewedBySuperAdmin is null",
    adminRequest.reviewedBySuperAdmin,
    null,
  );
  TestValidator.equals("deleted_at is null", adminRequest.deleted_at, null);
  TestValidator.predicate(
    "id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      adminRequest.id,
    ),
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    !isNaN(Date.parse(adminRequest.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    !isNaN(Date.parse(adminRequest.updated_at)),
  );
}
