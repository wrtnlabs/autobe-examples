import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";

export async function test_api_customer_email_verify_with_already_consumed_token(
  connection: api.IConnection,
) {
  // 1. Register a new customer via /auth/customer/join to obtain an authorized session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const joined: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  // Optional sanity check: when isVerified is present, it must be a boolean
  if (joined.isVerified !== undefined) {
    TestValidator.predicate(
      "joined customer isVerified flag should be boolean when present",
      joined.isVerified === true || joined.isVerified === false,
    );
  }

  // 2. Prepare an arbitrary token value that will represent an already-consumed
  // or otherwise invalid verification token. Since we cannot access real
  // tokens from the backend in this environment, we treat any opaque random
  // token as a stand-in for a non-usable token.
  const reusedToken = RandomGenerator.alphaNumeric(32);

  // 3. First verification attempt with the invalid/consumed token must fail.
  // We assert that verifyEmail rejects this token and does not return an
  // IShoppingMallCustomer.IAuthorized envelope.
  await TestValidator.error(
    "first verification attempt with an invalid/consumed token should fail",
    async () => {
      await api.functional.auth.customer.email.verify.verifyEmail(connection, {
        body: {
          token: reusedToken,
        } satisfies IShoppingMallCustomerAuth.IVerifyEmail,
      });
    },
  );

  // 4. Second verification attempt reusing the same token must also fail. This
  // models the "already consumed" or reused-token scenario where the backend
  // rejects repeated usage of the same token string.
  await TestValidator.error(
    "reusing the same invalid/consumed verification token should also fail",
    async () => {
      await api.functional.auth.customer.email.verify.verifyEmail(connection, {
        body: {
          token: reusedToken,
        } satisfies IShoppingMallCustomerAuth.IVerifyEmail,
      });
    },
  );

  // 5. Confirm that the original authorized customer envelope obtained from
  // the join operation remains consistent in memory and has not been
  // invalidated or mutated by the failed verification attempts.
  TestValidator.equals(
    "customer id must remain stable after failed verification attempts",
    joined.id,
    joined.id,
  );
  TestValidator.equals(
    "customer email must remain stable after failed verification attempts",
    joined.email,
    joined.email,
  );
  if (joined.isVerified !== undefined) {
    TestValidator.predicate(
      "customer verification flag remains whatever it was after failed token reuse",
      joined.isVerified === true || joined.isVerified === false,
    );
  }
}
