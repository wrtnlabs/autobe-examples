import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerAdminRequest";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
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
import { generate_random_ecommerce_mall_seller_seller_admin_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_admin_requests_create";
import { prepare_random_ecommerce_mall_seller_admin_request } from "../../../prepare/prepare_random_ecommerce_mall_seller_admin_request";

export async function test_api_seller_admin_request_retrieve_approved_request(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin via POST /ecommerceMall/auth/superAdmin/join
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {});
  // 2. Create and authenticate as a seller via POST /ecommerceMall/auth/seller/join
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 3. Seller submits admin privilege request via POST /ecommerceMall/seller/seller/admin-requests
  const adminRequest =
    await api.functional.ecommerceMall.seller.seller.admin_requests.create(
      sellerConnection,
      {
        body: {
          reason:
            "Need admin privileges to manage platform content and users effectively.",
        } satisfies IEcommerceMallSellerAdminRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  TestValidator.equals(
    "request status is pending",
    adminRequest.status,
    "pending",
  );
  TestValidator.equals(
    "rejection_reason is null",
    adminRequest.rejection_reason,
    null,
  );
  const createdAt = adminRequest.created_at;
  // 4. SuperAdmin approves the request via PUT /ecommerceMall/superAdmin/admin/requests/{requestId}
  const approvedRequest =
    await api.functional.ecommerceMall.superAdmin.admin.requests.update(
      superAdminConnection,
      {
        requestId: adminRequest.id,
        body: {
          status: "approved",
        } satisfies IEcommerceMallAdminRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals(
    "request status is approved",
    approvedRequest.status,
    "approved",
  );
  // 5. SuperAdmin retrieves the now-approved request via GET /ecommerceMall/superAdmin/seller/admin-requests/{requestId}
  const retrievedRequest =
    await api.functional.ecommerceMall.superAdmin.seller.admin_requests.at(
      superAdminConnection,
      {
        requestId: adminRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 6. Validate response includes:
  // - status='approved'
  // - reviewedBySuperAdmin populated with superAdmin summary (id, email, created_at)
  // - rejection_reason=null
  // - updated_at timestamp updated after approval
  TestValidator.equals(
    "status is approved",
    retrievedRequest.status,
    "approved",
  );
  TestValidator.equals(
    "rejection_reason is null",
    retrievedRequest.rejection_reason,
    null,
  );
  TestValidator.equals(
    "reviewedBySuperAdmin exists",
    retrievedRequest.reviewedBySuperAdmin !== null,
    true,
  );
  TestValidator.equals(
    "reviewedBySuperAdmin id matches",
    retrievedRequest.reviewedBySuperAdmin!.id,
    superAdmin.id,
  );
  TestValidator.equals(
    "reviewedBySuperAdmin email matches",
    retrievedRequest.reviewedBySuperAdmin!.email,
    superAdmin.email,
  );
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(retrievedRequest.updated_at) > new Date(createdAt),
  );
}
