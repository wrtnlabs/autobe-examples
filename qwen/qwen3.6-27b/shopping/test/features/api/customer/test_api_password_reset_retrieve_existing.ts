import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerPasswordReset";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
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
 * Test retrieval of an existing password reset token record by UUID.
 *
 * Validates the password reset retrieval endpoint by authenticating as a customer and fetching a reset token record. The test verifies that the response includes all expected fields with correct types and that business rules are enforced properly.
 *
 * Special attention is given to ensuring the customer reference in the reset record links correctly to the authenticated customer account, timestamps conform to ISO 8601 format, the token is properly masked (showing only last 4 characters) for security, and used_at is null for unused tokens.
 *
 * 1. Authenticate as a customer by joining the platform.
 * 2. Generate a random UUID to use as the resetId for retrieval.
 * 3. Call GET /ecommercePlatform/customer/password-resets/{resetId} with the generated resetId.
 * 4. Validate response structure with typia.assert for complete type checking.
 * 5. Verify customer reference links correctly to the authenticated customer.
 * 6. Confirm token is masked and timestamps are valid ISO 8601 strings.
 * 7. Verify used_at is null for unused tokens.
 */
export async function test_api_password_reset_retrieve_existing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Generate random resetId
  const resetId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve password reset record
  const passwordReset =
    await api.functional.ecommercePlatform.customer.password_resets.at(
      customerConnection,
      { resetId },
    );
  // 4. Validate response structure
  typia.assert(passwordReset);
  // 5. Verify customer reference matches authenticated customer
  TestValidator.equals(
    "customer reference links to authenticated customer",
    passwordReset.customer.id,
    authorized.id,
  );
  // 6. Verify token is masked (last 4 characters visible)
  TestValidator.predicate(
    "token is masked - shows only last 4 characters",
    passwordReset.token.length >= 4,
  );
  // 7. Verify timestamps are valid ISO 8601 strings
  TestValidator.predicate(
    "created_at is valid ISO 8601 string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      passwordReset.created_at,
    ),
  );
  TestValidator.predicate(
    "expired_at is valid ISO 8601 string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      passwordReset.expired_at,
    ),
  );
  // 8. Verify used_at is null for unused token
  TestValidator.equals(
    "used_at is null for unused token",
    passwordReset.used_at,
    null,
  );
}
