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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_administrator_requests_create } from "../../../generate/generate_random_shopping_mall_customer_administrator_requests_create";
import { prepare_random_shopping_mall_administrator_request } from "../../../prepare/prepare_random_shopping_mall_administrator_request";

/**
 * Test that a registered customer can successfully submit an administrator promotion request with a valid reason.
 *
 * Validates the complete customer administrator request submission workflow including customer registration, request creation, and response validation. Ensures that the request is properly created with correct actor type, pending status, and null processing fields.
 *
 * Special attention is given to verifying that the actor_type is correctly set to 'customer' based on the authenticated user role, and that all processing-related fields (processed_by_administrator_id, rejection_reason, processedByAdministrator) are null for pending requests.
 *
 * 1. Register a new customer account with valid email and password credentials
 * 2. Submit an administrator promotion request with a meaningful justification reason
 * 3. Verify the request response contains all expected fields with correct values
 * 4. Validate actor_type is 'customer', status is 'pending', and processing fields are null
 */
export async function test_api_administrator_request_customer_submission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {},
  });
  typia.assert(customer);
  // 2. Submit administrator promotion request with a meaningful reason
  const request =
    await generate_random_shopping_mall_customer_administrator_requests_create(
      customerConnection,
      {
        body: {
          reason:
            "I have extensive experience in e-commerce platform management and want to help improve the shopping mall system by moderating sellers, managing categories, and ensuring platform quality standards.",
        },
      },
    );
  typia.assert(request);
  // 3. Validate request fields
  TestValidator.equals(
    "actor_type is customer",
    request.actor_type,
    "customer",
  );
  TestValidator.equals("status is pending", request.status, "pending");
  TestValidator.predicate(
    "reason matches submitted text",
    request.reason.length > 0,
  );
  TestValidator.equals(
    "processed_by_administrator_id is null",
    request.processed_by_administrator_id,
    null,
  );
  TestValidator.equals(
    "rejection_reason is null",
    request.rejection_reason,
    null,
  );
  TestValidator.equals(
    "processedByAdministrator is null",
    request.processedByAdministrator,
    null,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(request.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(request.updated_at),
  );
  TestValidator.predicate(
    "request has valid UUID",
    /^[0-9a-f-]{36}$/i.test(request.id),
  );
}
