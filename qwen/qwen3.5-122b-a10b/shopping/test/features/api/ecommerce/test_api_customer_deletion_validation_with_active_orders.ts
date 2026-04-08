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
 * Test customer deletion validation endpoint response structure.
 *
 * Validates the deletion eligibility check endpoint by testing the response structure and ensuring proper type validation. This test verifies that the endpoint returns a valid IEcommerceDeletionValidationResult object with properly formatted fields when checking customer deletion eligibility.
 *
 * Since order creation is not available in the current SDK functions, this test focuses on validating the endpoint response format and type safety rather than testing the complete business logic of order blocking deletion.
 *
 * 1. Register and authenticate a new customer account.
 * 2. Call the deletion validation endpoint to check eligibility.
 * 3. Verify response is a valid IEcommerceDeletionValidationResult object.
 * 4. Validate resourceType field is a string.
 * 5. Validate resourceId field is UUID format when present.
 * 6. Validate reason field is a non-empty string when present.
 */
export async function test_api_customer_deletion_validation_with_active_orders(
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
  // 2. Call deletion validation endpoint
  const validation =
    await api.functional.ecommerce.customer.deletion_validation.at(
      customerConnection,
    );
  typia.assert(validation);
  // 3. Validate response structure - resourceType is a string
  TestValidator.predicate(
    "resourceType is string",
    typeof validation.resourceType === "string",
  );
  // 4. Validate resourceId is UUID format when present
  TestValidator.predicate(
    "resourceId is UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      validation.resourceId,
    ),
  );
  // 5. Validate reason is non-empty string
  TestValidator.predicate(
    "reason is non-empty string",
    typeof validation.reason === "string" && validation.reason.length > 0,
  );
}
