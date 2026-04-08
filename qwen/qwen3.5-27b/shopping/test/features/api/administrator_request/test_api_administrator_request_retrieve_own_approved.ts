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
 * Test that a customer can retrieve their administrator promotion request after it has been approved by a super administrator.
 *
 * Validates the complete administrator request approval workflow including customer registration, request creation, super administrator approval, and request retrieval. Ensures that the approved request correctly shows the processing administrator information and maintains the original request details.
 *
 * Special attention is given to verifying that the approval status is correctly reflected, the rejection_reason is null for approved requests, and the processedByAdministrator field contains valid super administrator summary data.
 *
 * 1. Customer registers and authenticates with email and password credentials.
 * 2. Customer creates an administrator promotion request with a justification reason.
 * 3. Super administrator registers and authenticates with email and password credentials.
 * 4. Super administrator approves the customer's administrator promotion request.
 * 5. Customer retrieves the approved administrator request using the request ID.
 * 6. Validates that the request shows approved status with correct processing administrator information.
 */
export async function test_api_administrator_request_retrieve_own_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
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
  // 2. Customer creates administrator promotion request
  const adminRequest =
    await generate_random_shopping_mall_customer_administrator_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(adminRequest);
  // 3. Super administrator registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // 4. Super administrator approves the request
  const approvedRequest =
    await api.functional.shoppingMall.administrator.administrator_requests.update(
      adminConnection,
      {
        administratorRequestId: adminRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallAdministratorRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  // 5. Customer retrieves the approved request
  const retrievedRequest =
    await api.functional.shoppingMall.customer.administrator_requests.at(
      customerConnection,
      {
        administratorRequestId: adminRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 6. Validate the approved request data
  TestValidator.equals(
    "request ID matches",
    retrievedRequest.id,
    adminRequest.id,
  );
  TestValidator.equals(
    "actor type is customer",
    retrievedRequest.actor_type,
    "customer",
  );
  TestValidator.equals(
    "reason matches original",
    retrievedRequest.reason,
    adminRequest.reason,
  );
  TestValidator.equals(
    "status is approved",
    retrievedRequest.status,
    "approved",
  );
  TestValidator.equals(
    "rejection reason is null",
    retrievedRequest.rejection_reason,
    null,
  );
  TestValidator.predicate(
    "processed by administrator ID exists",
    retrievedRequest.processed_by_administrator_id !== null,
  );
  TestValidator.predicate(
    "processed by administrator ID matches super admin",
    retrievedRequest.processed_by_administrator_id === adminAuth.id,
  );
  TestValidator.predicate(
    "processedByAdministrator object exists",
    retrievedRequest.processedByAdministrator !== null,
  );
  if (retrievedRequest.processedByAdministrator !== null) {
    TestValidator.equals(
      "processedByAdministrator ID matches",
      retrievedRequest.processedByAdministrator.id,
      adminAuth.id,
    );
    TestValidator.equals(
      "processedByAdministrator grade is super",
      retrievedRequest.processedByAdministrator.grade,
      "super",
    );
  }
  TestValidator.predicate(
    "created_at exists",
    retrievedRequest.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrievedRequest.updated_at !== null,
  );
}
