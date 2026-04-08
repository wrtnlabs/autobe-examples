import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerPasswordReset";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Verify customer password changes are scoped only to the authenticated account owner.
 *
 * This test validates the self-service password change flow for a customer session and confirms the endpoint updates only the caller-owned credential record. It ensures the response remains tied to the same authenticated customer account and does not require any unrelated business data to change.
 *
 * The scenario focuses on ownership protection and the single-account update rule. It uses an authenticated customer connection, performs a valid password change, and checks that the returned password reset record belongs to the same customer account that performed the request.
 *
 * 1. Register a customer account and authenticate an isolated customer connection.
 * 2. Request a password change using the authenticated customer’s current and new passwords.
 * 3. Validate that the response belongs to the same customer account and includes update metadata.
 */
export async function test_api_customer_password_change_owner_scope_only(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = `Pw${RandomGenerator.alphabets(8)}!1`;
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email,
      password,
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const updated = await api.functional.mallPlatform.customer.passwords.update(
    customerConnection,
    {
      body: {
        currentPassword: password,
        newPassword: `Np${RandomGenerator.alphabets(8)}!2`,
      } satisfies IMallPlatformCustomerPasswordReset.IUpdate,
    },
  );
  typia.assert(updated);
  TestValidator.equals("password reset record email", updated.email, email);
  TestValidator.predicate(
    "password reset record updatedAt is populated",
    updated.updatedAt.length > 0,
  );
}
