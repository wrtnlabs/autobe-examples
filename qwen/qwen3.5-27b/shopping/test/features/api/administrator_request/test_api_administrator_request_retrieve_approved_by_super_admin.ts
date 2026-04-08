import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
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
import { generate_random_shopping_mall_customer_administrator_requests_create } from "../../../generate/generate_random_shopping_mall_customer_administrator_requests_create";
import { prepare_random_shopping_mall_administrator_request } from "../../../prepare/prepare_random_shopping_mall_administrator_request";

/**
 * Test that a super administrator can retrieve complete details of an approved administrator promotion request.
 *
 * Validates the complete administrator request approval workflow including customer request submission, super administrator approval, and request detail retrieval. Ensures that the approved request contains accurate processing information and that the super administrator's details are correctly recorded.
 *
 * Special attention is given to verifying that the processedByAdministrator field contains the correct super administrator summary and that the rejection_reason is null for approved requests.
 *
 * 1. Customer registers and authenticates with email and password.
 * 2. Customer submits an administrator promotion request with justification reason.
 * 3. Super administrator registers and authenticates with email and password.
 * 4. Super administrator approves the customer's administrator request.
 * 5. Super administrator retrieves the approved request details by ID.
 * 6. Validates request status is 'approved', actor_type is 'customer', and processedByAdministrator contains super admin info.
 */
export async function test_api_administrator_request_retrieve_approved_by_super_admin(
  connection: api.IConnection,
) {
  // 1. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  // 2. Customer submits administrator request
  const reason = RandomGenerator.paragraph({ sentences: 3 });
  const request =
    await generate_random_shopping_mall_customer_administrator_requests_create(
      customerConnection,
      {
        body: { reason },
      },
    );
  typia.assert(request);
  // 3. Super administrator setup
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(superAdminAuth);
  // 4. Super administrator approves the request
  const approvedRequest =
    await api.functional.shoppingMall.administrator.administrator_requests.update(
      superAdminConnection,
      {
        administratorRequestId: request.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallAdministratorRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  // 5. Super administrator retrieves the approved request
  const retrievedRequest =
    await api.functional.shoppingMall.administrator.administrator_requests.at(
      superAdminConnection,
      {
        administratorRequestId: request.id,
      },
    );
  typia.assert(retrievedRequest);
  // 6. Validate request details
  TestValidator.equals(
    "request status is approved",
    retrievedRequest.status,
    "approved",
  );
  TestValidator.equals(
    "actor type is customer",
    retrievedRequest.actor_type,
    "customer",
  );
  TestValidator.equals(
    "reason matches submitted",
    retrievedRequest.reason,
    reason,
  );
  TestValidator.equals(
    "rejection reason is null",
    retrievedRequest.rejection_reason,
    null,
  );
  TestValidator.predicate(
    "has created_at timestamp",
    retrievedRequest.created_at !== undefined,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    retrievedRequest.updated_at !== undefined,
  );
  // 7. Validate processedByAdministrator contains super admin info
  TestValidator.predicate(
    "processedByAdministrator exists",
    retrievedRequest.processedByAdministrator !== null,
  );
  if (retrievedRequest.processedByAdministrator !== null) {
    TestValidator.equals(
      "processed by super admin id",
      retrievedRequest.processedByAdministrator.id,
      superAdminAuth.id,
    );
    TestValidator.equals(
      "processed by super admin email",
      retrievedRequest.processedByAdministrator.email,
      superAdminAuth.email,
    );
    TestValidator.equals(
      "processed by admin grade is super",
      retrievedRequest.processedByAdministrator.grade,
      "super",
    );
  }
}
