import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdminRegistrationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdminRegistrationRequest";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_e_commerce_mall_customer_admin_registration_requests_create } from "../../../generate/generate_random_e_commerce_mall_customer_admin_registration_requests_create";
import { prepare_random_ecommerce_mall_admin_registration_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_registration_request";

/**
 * Test that a customer can retrieve their own rejected administrator registration request.
 *
 * Validates that when a super administrator rejects an admin registration request, the rejection reason, reviewer identity, and review timestamp are properly preserved and visible to the requesting customer.
 *
 * 1. Customer A registers and submits an admin registration request.
 * 2. A regular administrator is registered and promoted to super administrator.
 * 3. The super administrator rejects the request with a specific reason.
 * 4. Customer A retrieves the request and verifies:
 *    - Status is 'rejected'
 *    - Rejection reason matches the provided reason
 *    - Reviewer identity contains the super admin's email
 *    - reviewed_at is a valid ISO datetime string (not null)
 *    - Requester resolves to Customer A with matching email
 *    - All timestamps are valid
 */
export async function test_api_admin_registration_request_view_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Customer A
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 2. Customer A submits an admin registration request
  const registration =
    await generate_random_e_commerce_mall_customer_admin_registration_requests_create(
      customerConnection,
      {},
    );
  typia.assert(registration);
  // 3. Register a regular administrator, capture admin ID
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 4. Promote regular admin to super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        administrator_id: adminAuth.id,
      },
    },
  );
  typia.assert(superAdminAuth);
  // 5. Super admin rejects the request
  const rejectionReason =
    "Your experience does not match current platform needs.";
  const rejected =
    await api.functional.eCommerceMall.superAdministrator.admin_registration_requests.update(
      superAdminConnection,
      {
        requestId: registration.id,
        body: {
          status: "rejected" as const,
          rejectionReason: rejectionReason,
        } satisfies IECommerceMallAdminRegistrationRequest.IUpdate,
      },
    );
  typia.assert(rejected);
  // 6. Customer A retrieves the rejected request
  const retrieved =
    await api.functional.eCommerceMall.customer.admin_registration_requests.at(
      customerConnection,
      {
        requestId: registration.id,
      },
    );
  typia.assert(retrieved);
  // 7. Validate response
  TestValidator.equals("status is rejected", retrieved.status, "rejected");
  TestValidator.equals(
    "rejection reason matches",
    retrieved.rejection_reason,
    rejectionReason,
  );
  TestValidator.predicate("reviewer is not null", retrieved.reviewer !== null);
  TestValidator.equals(
    "reviewer email matches super admin",
    retrieved.reviewer!.email,
    superAdminAuth.email,
  );
  TestValidator.predicate(
    "reviewed_at is present",
    retrieved.reviewed_at !== null,
  );
  TestValidator.equals(
    "requester_type is customer",
    retrieved.requester_type,
    "customer",
  );
  TestValidator.equals(
    "requester email matches customer",
    (retrieved.requester as IECommerceMallCustomer.ISummary).email,
    customerAuth.email,
  );
  TestValidator.predicate(
    "created_at is valid",
    typeof retrieved.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is valid",
    typeof retrieved.updated_at === "string",
  );
}
