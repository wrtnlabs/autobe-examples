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
 * Test retrieving admin request details as a super administrator.
 *
 * Validates the GET /ecommerceMall/superAdmin/admin-requests/{requestId} endpoint by
 * creating a seller who submits an admin request, then having a super admin retrieve
 * the complete request details. This test verifies that super admins can access
 * admin request information including the requesting actor's details, submission reason,
 * current status, and timestamps.
 *
 * The test flow:
 * 1. Register a seller who will submit the admin request
 * 2. Seller creates an admin request with a reason text
 * 3. Register a super administrator
 * 4. Super admin retrieves the admin request details
 * 5. Validate the response contains all expected fields
 *
 * Special attention is given to verifying:
 * - The request ID matches what was created
 * - The actor_type is correctly set to 'seller'
 * - The seller's summary information is included
 * - The reason text is preserved
 * - The status is 'pending' (not yet reviewed)
 * - All timestamps are present and valid
 */
export async function test_api_admin_request_retrieval_approved_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a seller who will submit the admin request
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Seller creates an admin request
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
  // 3. Register a super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 4. Super admin retrieves the admin request details
  const retrievedRequest =
    await api.functional.ecommerceMall.superAdmin.admin_requests.at(
      superAdminConnection,
      {
        requestId: adminRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 5. Validate the response
  TestValidator.equals(
    "request ID matches",
    retrievedRequest.id,
    adminRequest.id,
  );
  TestValidator.equals(
    "actor type is seller",
    retrievedRequest.actorType,
    "seller",
  );
  TestValidator.equals("status is pending", retrievedRequest.status, "pending");
  TestValidator.equals(
    "reason matches input",
    retrievedRequest.reason,
    adminRequest.reason,
  );
  TestValidator.equals(
    "seller info present",
    retrievedRequest.seller !== null && retrievedRequest.seller !== undefined,
    true,
  );
  TestValidator.equals(
    "seller email matches",
    retrievedRequest.seller?.email,
    adminRequest.seller.email,
  );
  TestValidator.predicate(
    "deletedAt is null",
    retrievedRequest.deletedAt === null,
  );
  TestValidator.predicate(
    "createdAt is valid",
    retrievedRequest.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt is valid",
    retrievedRequest.updatedAt.length > 0,
  );
}
