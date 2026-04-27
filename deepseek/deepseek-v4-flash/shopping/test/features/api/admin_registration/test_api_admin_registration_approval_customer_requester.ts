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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_e_commerce_mall_customer_admin_registration_requests_create } from "../../../generate/generate_random_e_commerce_mall_customer_admin_registration_requests_create";
import { prepare_random_ecommerce_mall_admin_registration_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_registration_request";

/**
 * Test that a super administrator can approve a customer's pending administrator registration request.
 *
 * Validates the complete workflow: a customer registers, submits an administrator registration request, and a super administrator approves it. Verifies that the request transitions from "pending" to "approved" with appropriate reviewer and timestamp fields populated.
 *
 * Special attention is given to verifying that the original request fields (requester_type, reason, requester details) remain unchanged after approval, and that the reviewer is correctly identified as a super administrator with grade "super".
 *
 * 1. Customer registers and authenticates via join endpoint.
 * 2. Customer submits an admin registration request with a textual reason.
 * 3. Super administrator logs in (pre-seeded super admin account).
 * 4. Super administrator approves the pending request via update endpoint.
 * 5. Validates response: status, rejection_reason, reviewer, reviewed_at, original fields.
 */
export async function test_api_admin_registration_approval_customer_requester(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 2. Submit admin registration request as customer
  const request =
    await generate_random_e_commerce_mall_customer_admin_registration_requests_create(
      customerConnection,
      {},
    );
  typia.assert(request);
  // 3. Login as pre-seeded super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_login(
    superAdminConnection,
    {
      body: {
        email: "admin@test.com",
        password: "1234",
        href: "http://localhost/test",
        referrer: "http://localhost/test",
      } satisfies IECommerceMallSuperAdministrator.ILogin,
    },
  );
  typia.assert(superAdmin);
  // 4. Approve the admin registration request
  const updated =
    await api.functional.eCommerceMall.superAdministrator.admin_registration_requests.update(
      superAdminConnection,
      {
        requestId: request.id,
        body: {
          status: "approved" as const,
        } satisfies IECommerceMallAdminRegistrationRequest.IUpdate,
      },
    );
  typia.assert(updated);
  // 5. Validate the approved request
  TestValidator.equals("status is approved", updated.status, "approved");
  TestValidator.predicate(
    "rejection_reason is null",
    () => updated.rejection_reason === null,
  );
  TestValidator.predicate("reviewer is set", () => updated.reviewer !== null);
  if (updated.reviewer !== null) {
    TestValidator.equals(
      "reviewer grade is super",
      updated.reviewer.administrator.grade,
      "super",
    );
  }
  TestValidator.predicate(
    "reviewed_at is set",
    () => updated.reviewed_at !== null,
  );
  TestValidator.equals(
    "requester_type is customer",
    updated.requester_type,
    "customer",
  );
  TestValidator.equals("reason is preserved", updated.reason, request.reason);
  TestValidator.equals("id is preserved", updated.id, request.id);
  TestValidator.predicate(
    "created_at is preserved",
    () => updated.created_at === request.created_at,
  );
  TestValidator.predicate(
    "updated_at reflects review",
    () => updated.updated_at !== request.updated_at,
  );
}
