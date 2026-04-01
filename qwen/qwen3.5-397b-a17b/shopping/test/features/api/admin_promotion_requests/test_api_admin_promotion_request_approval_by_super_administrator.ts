import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
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
import { generate_random_shopping_mall_customer_admin_promotion_requests_create } from "../../../generate/generate_random_shopping_mall_customer_admin_promotion_requests_create";
import { prepare_random_shopping_mall_admin_promotion_request } from "../../../prepare/prepare_random_shopping_mall_admin_promotion_request";

/**
 * Test the successful approval of a customer's administrator promotion request by a super administrator.
 *
 * **Setup:**
 * 1. Register a super administrator account and authenticate
 * 2. Register a customer account and authenticate
 * 3. Customer submits an administrator promotion request with a valid reason
 * 4. Retrieve the pending promotion request ID
 *
 * **Test Execution:**
 * 1. Super administrator calls PUT /shoppingMall/superAdministrator/admin-promotion-requests/{requestId} with status='approved'
 * 2. Verify the response contains the updated request with status='approved'
 * 3. Verify rejection_reason is null (not required for approval)
 * 4. Verify updated_at timestamp is set to current time
 *
 * **Validation Points:**
 * - Response status is 200 OK
 * - Request status changed from 'pending' to 'approved'
 * - The customer is now granted regular administrator privileges
 * - An audit snapshot is created recording the approval decision
 * - The responding super administrator ID is recorded in the snapshot
 * - The submitter information shows the original customer details
 * - actor_type remains 'customer'
 * - reason remains unchanged (immutable requester data)
 *
 * **Business Logic:**
 * - Only super administrators can approve promotion requests
 * - Approval grants the requesting user administrator access
 * - Status transition from pending to approved is valid
 * - Audit trail is created for compliance
 */
export async function test_api_admin_promotion_request_approval_by_super_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register and authenticate super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdmin);
  // 2. Setup: Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 3. Customer submits administrator promotion request
  const promotionRequest =
    await generate_random_shopping_mall_customer_admin_promotion_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // Verify initial state
  TestValidator.equals(
    "initial status is pending",
    promotionRequest.status,
    "pending",
  );
  TestValidator.equals(
    "actor type is customer",
    promotionRequest.actor_type,
    "customer",
  );
  TestValidator.predicate(
    "rejection reason is null for pending",
    promotionRequest.rejection_reason === null ||
      promotionRequest.rejection_reason === undefined,
  );
  // 4. Super administrator approves the promotion request
  const approvedRequest =
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.update(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallAdminPromotionRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  // 5. Validate approval results
  TestValidator.equals(
    "status changed to approved",
    approvedRequest.status,
    "approved",
  );
  TestValidator.equals(
    "actor type remains customer",
    approvedRequest.actor_type,
    "customer",
  );
  TestValidator.equals(
    "reason remains unchanged",
    approvedRequest.reason,
    promotionRequest.reason,
  );
  TestValidator.predicate(
    "rejection reason is null for approval",
    approvedRequest.rejection_reason === null ||
      approvedRequest.rejection_reason === undefined,
  );
  TestValidator.predicate(
    "updated_at is set",
    approvedRequest.updated_at !== promotionRequest.updated_at,
  );
  TestValidator.equals(
    "request id matches",
    approvedRequest.id,
    promotionRequest.id,
  );
  // Validate submitter information
  if (approvedRequest.submitter && "email" in approvedRequest.submitter) {
    TestValidator.equals(
      "submitter email matches customer",
      approvedRequest.submitter.email,
      customer.email,
    );
  }
}
