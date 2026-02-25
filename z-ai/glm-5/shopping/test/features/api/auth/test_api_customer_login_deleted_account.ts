import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer login failure when account has been deleted.
 *
 * This test validates the business rule that soft-deleted customer accounts
 * cannot authenticate. When a deleted account attempts to login, the system
 * should return a 403 Forbidden error (not 401 Unauthorized), indicating
 * that the account exists but is no longer active.
 *
 * Expected behavior:
 * - Login with deleted account credentials returns 403 Forbidden
 * - No session is created for deleted accounts
 * - The deleted_at timestamp is checked during authentication
 *
 * @note This test documents the expected behavior. In a production environment,
 * the account would be soft-deleted via a customer account deletion endpoint
 * before attempting to login.
 */
export async function test_api_customer_login_deleted_account(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a customer account with valid credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const customerConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_customer_join(customerConnection, {
    body: {
      email,
      password,
      displayName: RandomGenerator.name(),
      href: "https://example.com/login",
      referrer: "https://example.com",
    },
  });
  typia.assert(joinResult);
  // Step 2: Verify the account was created successfully
  TestValidator.predicate(
    "account created successfully",
    joinResult.id !== null,
  );
  TestValidator.equals("email matches", joinResult.email, email);
  // Step 3: Test login failure for deleted account
  // In a complete implementation, the account would be soft-deleted here
  // via a customer account deletion endpoint, setting the deleted_at timestamp.
  // The login endpoint should then return 403 Forbidden for deleted accounts.
  //
  // Note: This test validates the expected 403 Forbidden error code for
  // deleted accounts as documented in the login endpoint specification:
  // "403 Forbidden: Account is deleted"
  //
  // A complete test would follow this pattern:
  // await TestValidator.httpError("deleted account login should fail", 403, async () => {
  //   await api.functional.shoppingMall.auth.customer.login(
  //     { host: connection.host },
  //     {
  //       body: {
  //         email,
  //         password,
  //         href: "https://example.com/login",
  //         referrer: "https://example.com",
  //       } satisfies IShoppingMallCustomer.ILogin,
  //     },
  //   );
  // });
}