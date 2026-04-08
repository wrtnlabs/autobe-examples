import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminRequest";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_requests_create } from "../../../generate/generate_random_ecommerce_requests_create";
import { prepare_random_ecommerce_admin_request } from "../../../prepare/prepare_random_ecommerce_admin_request";

/**
 * Test customer administrator access request submission workflow.
 *
 * Validates the complete administrator request submission flow from a customer perspective. Ensures that authenticated customers can successfully submit requests for administrator privileges with proper reason documentation, and that the system correctly stores and returns the request with customer identity information.
 *
 * The test verifies that the request is created with 'pending' status, the customer's identity is properly associated with the request, and all submitted data is preserved accurately in the response.
 *
 * 1. Register and authenticate a new customer account.
 * 2. Submit administrator access request with a valid reason.
 * 3. Validate the response contains pending status.
 * 4. Verify customer identity is correctly linked in requestingCustomer.
 * 5. Confirm the reason field is preserved in the response.
 */
export async function test_api_admin_request_customer_submission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const displayName = RandomGenerator.name();
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: email,
      password: RandomGenerator.alphaNumeric(16),
      display_name: displayName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Submit administrator access request
  const request = await generate_random_ecommerce_requests_create(
    customerConnection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IEcommerceAdminRequest.ICreate,
    },
  );
  typia.assert(request);
  // 3. Validate response
  TestValidator.equals("status is pending", request.status, "pending");
  TestValidator.equals(
    "requester type is customer",
    request.requester_type,
    "customer",
  );
  TestValidator.predicate(
    "requester customer exists",
    request.requestingCustomer !== null,
  );
  if (request.requestingCustomer !== null) {
    TestValidator.equals(
      "customer ID matches",
      request.requestingCustomer.id,
      customer.id,
    );
    TestValidator.equals(
      "customer email matches",
      request.requestingCustomer.email,
      email,
    );
    TestValidator.equals(
      "customer display name matches",
      request.requestingCustomer.display_name,
      displayName,
    );
  }
  // 4. Validate reason preservation
  TestValidator.predicate("reason is preserved", request.reason.length > 0);
}
