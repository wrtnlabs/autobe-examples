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
 * Test that the original requestor (customer) can retrieve their own pending administrator promotion request to check status.
 *
 * Validates the administrator request retrieval flow for the original customer requestor. Ensures that customers can view their own pending administrator promotion requests to monitor the approval status.
 *
 * Special attention is given to verifying that pending requests show null values for processing administrator fields and rejection reason, confirming the request has not yet been reviewed by any administrator.
 *
 * 1. Register and authenticate a customer account.
 * 2. Customer submits an administrator promotion request with justification reason.
 * 3. Same customer retrieves their own pending request using the request ID.
 * 4. Validate request details show pending status with null processing fields.
 */
export async function test_api_administrator_request_retrieve_pending_by_requestor(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Submit administrator promotion request
  const reason = RandomGenerator.paragraph({ sentences: 3 });
  const request =
    await api.functional.shoppingMall.customer.administrator_requests.create(
      customerConnection,
      {
        body: {
          reason: reason,
        } satisfies IShoppingMallAdministratorRequest.ICreate,
      },
    );
  typia.assert(request);
  // 3. Retrieve the pending request as the same customer
  const retrieved =
    await api.functional.shoppingMall.administrator.administrator_requests.at(
      customerConnection,
      {
        administratorRequestId: request.id,
      },
    );
  typia.assert(retrieved);
  // 4. Validate request details
  TestValidator.equals("request ID matches", retrieved.id, request.id);
  TestValidator.equals("status is pending", retrieved.status, "pending");
  TestValidator.equals(
    "actor type is customer",
    retrieved.actor_type,
    "customer",
  );
  TestValidator.equals("reason matches submitted", retrieved.reason, reason);
  TestValidator.equals(
    "processed_by_administrator_id is null",
    retrieved.processed_by_administrator_id,
    null,
  );
  TestValidator.equals(
    "processedByAdministrator is null",
    retrieved.processedByAdministrator,
    null,
  );
  TestValidator.equals(
    "rejection_reason is null",
    retrieved.rejection_reason,
    null,
  );
  TestValidator.predicate(
    "created_at is present",
    retrieved.created_at !== undefined && retrieved.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is present",
    retrieved.updated_at !== undefined && retrieved.updated_at.length > 0,
  );
}
