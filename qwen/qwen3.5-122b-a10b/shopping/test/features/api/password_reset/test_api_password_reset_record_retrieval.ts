import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerPasswordReset";
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
 * Test customer password reset record retrieval by UUID identifier.
 *
 * Validates the password reset token management system by testing the retrieval of password reset records using their unique UUID identifiers. This ensures that authenticated customers can access their password reset token metadata including expiration status and usage information.
 *
 * The test verifies complete response structure validation for password reset records, ensuring all fields are properly returned with correct types including UUID identifiers, cryptographic tokens, timestamps, and nullable usage tracking fields.
 *
 * 1. Customer authenticates via join endpoint to obtain JWT tokens.
 * 2. Customer-specific connection is created with authentication headers.
 * 3. Password reset record is retrieved using a generated UUID identifier.
 * 4. Response is validated using typia.assert() for complete type safety.
 */
export async function test_api_password_reset_record_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Retrieve password reset record by UUID
  const resetId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const passwordReset =
    await api.functional.ecommerce.customer.password_resets.at(
      customerConnection,
      {
        resetId,
      },
    );
  typia.assert(passwordReset);
}
