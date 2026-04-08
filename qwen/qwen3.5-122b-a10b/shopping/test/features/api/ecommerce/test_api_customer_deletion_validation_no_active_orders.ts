import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceDeletionValidationResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDeletionValidationResult";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer account deletion validation with no active orders.
 *
 * Validates that a customer account without any active orders can be validated for deletion. This test ensures the deletion validation endpoint correctly processes requests from accounts with no blocking constraints.
 *
 * The test creates a fresh customer account with no order history, then calls the deletion validation endpoint to verify the endpoint responds correctly with the expected DTO structure.
 *
 * 1. Register a new customer account with random credentials.
 * 2. Create customer-specific connection for authenticated requests.
 * 3. Call deletion validation endpoint.
 * 4. Validate response structure with typia.assert().
 */
export async function test_api_customer_deletion_validation_no_active_orders(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Call deletion validation endpoint
  const validation =
    await api.functional.ecommerce.customer.deletion_validation.at(
      customerConnection,
    );
  typia.assert(validation);
}
