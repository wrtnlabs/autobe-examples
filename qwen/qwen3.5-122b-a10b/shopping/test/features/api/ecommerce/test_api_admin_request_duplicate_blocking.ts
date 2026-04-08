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
 * Test duplicate administrator request blocking for customers.
 *
 * Validates that a customer who already has a pending administrator request cannot submit another request. The system should reject duplicate submissions with a conflict error (409) to prevent multiple pending requests from the same user.
 *
 * This test ensures the duplicate request prevention business rule is enforced, maintaining data integrity in the administrator request workflow.
 *
 * 1. Register and authenticate a new customer.
 * 2. Submit first administrator request (should succeed with pending status).
 * 3. Attempt to submit second administrator request (should fail with 409 Conflict).
 * 4. Validate that the error response has HTTP 409 status code.
 */
export async function test_api_admin_request_duplicate_blocking(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create first administrator request (should succeed)
  const firstRequest = await generate_random_ecommerce_requests_create(
    customerConnection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IEcommerceAdminRequest.ICreate,
    },
  );
  typia.assert(firstRequest);
  TestValidator.equals(
    "first request status pending",
    firstRequest.status,
    "pending",
  );
  // 3. Attempt to create second administrator request (should fail with 409)
  await TestValidator.httpError(
    "duplicate request blocked with 409 Conflict",
    409,
    async () => {
      await generate_random_ecommerce_requests_create(customerConnection, {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceAdminRequest.ICreate,
      });
    },
  );
}
