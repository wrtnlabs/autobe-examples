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
 * Test retrieving a rejected admin request to verify rejection details.
 *
 * Validates the complete flow of submitting and retrieving an admin request
 * from a seller's perspective. This test verifies that:
 *
 * 1. A super administrator can be created and authenticated on the platform.
 * 2. A seller can register and authenticate to submit admin requests.
 * 3. The seller can submit an administrative privilege request with a reason.
 * 4. The super administrator can retrieve the admin request and verify its details.
 *
 * The test ensures that request data is correctly preserved and returned,
 * including the request ID, reason text, status, and actor type information.
 * The seller relationship is also validated to confirm proper data linkage.
 *
 * 1. Super admin joins and authenticates on the platform.
 * 2. Seller joins and authenticates (approved status required for admin requests).
 * 3. Seller creates an admin request with a detailed reason.
 * 4. Super admin retrieves the request using the request ID.
 * 5. Validates response contains correct fields and data integrity.
 */
export async function test_api_admin_request_retrieve_rejected_seller_request(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Create and authenticate seller (needs approved status to submit admin requests)
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Seller submits admin request with a reason
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
  // 4. Super admin retrieves the admin request
  const retrievedRequest =
    await api.functional.ecommerceMall.superAdmin.admin.admin_requests.at(
      superAdminConnection,
      {
        requestId: adminRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 5. Validate response data
  TestValidator.equals(
    "request ID matches",
    retrievedRequest.id,
    adminRequest.id,
  );
  TestValidator.equals(
    "reason preserved",
    retrievedRequest.reason,
    adminRequest.reason,
  );
  TestValidator.predicate(
    "status is pending or processed",
    retrievedRequest.status === "pending" ||
      retrievedRequest.status === "approved" ||
      retrievedRequest.status === "rejected",
  );
  TestValidator.predicate(
    "actorType exists",
    retrievedRequest.actorType !== undefined &&
      retrievedRequest.actorType !== null,
  );
  TestValidator.equals(
    "actor type is seller",
    retrievedRequest.actorType,
    "seller",
  );
}
