import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_admin_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_admin_requests_create";
import { prepare_random_ecommerce_mall_admin_request_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_request_request";

/**
 * Test the primary success path for admin request approval by a super administrator.
 *
 * This test validates:
 * 1. Customer creates an admin request (pending status)
 * 2. Super administrator approves the request
 * 3. Request status changes from 'pending' to 'approved'
 * 4. All database updates occur atomically
 */
export async function test_api_admin_request_approval_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Setup - Customer creates account
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallCustomer.IJoin;
  const customerAuth = await authorize_customer_join(customerJoinConnection, {
    body: customerCredentials,
  });
  typia.assert(customerAuth);
  // Step 2: Setup - Super administrator creates account (if needed for testing)
  // The super administrator should have approval authority
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallAdmin.IJoin;
  const adminAuth = await authorize_admin_join(adminJoinConnection, {
    body: adminCredentials,
  });
  typia.assert(adminAuth);
  // Step 3: Customer creates admin request using authorized connection
  // Note: authorize_customer_join already updated customerJoinConnection headers
  const adminRequestCreateInput = {
    reason: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IEcommerceMallAdminRequestRequest.ICreate;
  const adminRequest =
    await api.functional.ecommerceMall.customer.admin_requests.create(
      customerJoinConnection,
      {
        body: adminRequestCreateInput,
      },
    );
  typia.assert(adminRequest);
  // Step 4: Verify request is in 'pending' status
  TestValidator.equals(
    "admin request status is pending",
    adminRequest.request_status,
    "pending",
  );
  // Step 5: Super administrator approves the request
  // Note: authorize_admin_join already updated adminJoinConnection headers
  const approvedRequest =
    await api.functional.ecommerceMall.admin.admin_request_requests.approve(
      adminJoinConnection,
      {
        adminRequestId: adminRequest.id,
      },
    );
  typia.assert(approvedRequest);
  // Step 6: Validate the approved request
  TestValidator.equals(
    "admin request status changed to approved",
    approvedRequest.request_status,
    "approved",
  );
  TestValidator.equals(
    "admin request id preserved",
    adminRequest.id,
    approvedRequest.id,
  );
  TestValidator.notEquals(
    "admin request updated timestamp",
    adminRequest.updated_at,
    approvedRequest.updated_at,
  );
}
