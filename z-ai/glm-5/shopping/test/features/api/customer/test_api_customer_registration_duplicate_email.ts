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
 * Test that registration is rejected when attempting to register with an
 * email already registered to another customer account.
 *
 * Validates:
 * - Email uniqueness constraint is enforced at registration
 * - Email comparison is case-insensitive
 * - Proper error handling with HTTP 409 Conflict
 */
export async function test_api_customer_registration_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first customer with a unique email
  const firstCustomerEmail = typia.random<string & tags.Format<"email">>();
  const firstCustomer = await authorize_customer_join(connection, {
    body: {
      email: firstCustomerEmail,
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      phoneNumber: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(firstCustomer);
  // Step 2: Attempt to register second customer with the SAME email (case-insensitive)
  // Using uppercase version of the same email to test case-insensitivity
  const duplicateEmail = firstCustomerEmail.toUpperCase();
  await TestValidator.httpError(
    "duplicate email registration should fail",
    409,
    async () => {
      await api.functional.shoppingMall.auth.customer.join(connection, {
        body: {
          email: duplicateEmail,
          password: RandomGenerator.alphaNumeric(16),
          displayName: RandomGenerator.name(),
          phoneNumber: RandomGenerator.mobile(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IShoppingMallCustomer.IJoin,
      });
    },
  );
}
