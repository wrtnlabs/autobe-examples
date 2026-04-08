import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

/**
 * Test retrieving a customer's account information including soft-delete status.
 *
 * Validates that the customer retrieval endpoint returns complete customer account data with authentication details and profile information. The test verifies that all customer fields are properly returned, including the deleted_at field which indicates soft-delete status.
 *
 * Special attention is given to verifying that the customer record includes the nested profile object and that all timestamp fields are properly formatted in ISO 8601 date-time format.
 *
 * 1. Register a new customer account with email and password credentials.
 * 2. Retrieve the customer record using the customer ID from registration.
 * 3. Validate that all customer fields are present and properly typed.
 * 4. Verify the nested profile object contains display_name and phone_number.
 * 5. Confirm deleted_at is null for an active (non-deleted) customer.
 */
export async function test_api_customer_retrieve_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customer);
  // 2. Retrieve the customer record
  const retrieved = await api.functional.shoppingMall.customers.at(
    customerConnection,
    {
      customerId: customer.id,
    },
  );
  typia.assert(retrieved);
  // 3. Validate customer fields
  TestValidator.equals("customer id matches", retrieved.id, customer.id);
  TestValidator.equals(
    "customer email matches",
    retrieved.email,
    customer.email,
  );
  TestValidator.predicate(
    "banned is boolean",
    typeof retrieved.banned === "boolean",
  );
  TestValidator.predicate(
    "created_at is valid datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrieved.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrieved.updated_at),
  );
  // 4. Verify deleted_at is null for active customer
  TestValidator.equals(
    "deleted_at is null for active customer",
    retrieved.deleted_at,
    null,
  );
  // 5. Validate nested profile object
  TestValidator.predicate(
    "profile id exists",
    retrieved.profile.id !== undefined,
  );
  TestValidator.predicate(
    "profile display_name exists",
    retrieved.profile.display_name !== undefined,
  );
  TestValidator.predicate(
    "profile created_at is valid datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrieved.profile.created_at),
  );
  TestValidator.predicate(
    "profile updated_at is valid datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrieved.profile.updated_at),
  );
}
