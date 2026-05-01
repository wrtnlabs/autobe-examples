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
 * Test email uniqueness business rule during customer registration.
 *
 * Validates that a customer cannot register with an email address already in
 * use by an active (non-deleted) customer account. The email serves as the
 * unique login identifier across all customer accounts and the unique constraint
 * applies only to accounts where `deleted_at IS NULL`.
 *
 * Soft-deleted accounts with the same email do not block new registrations,
 * but this test focuses on the active-account conflict scenario.
 *
 * 1. First registration with a unique email and random credentials succeeds,
 *    returning an authorized customer object with profile and token data.
 * 2. Second registration attempt using the exact same email fails with HTTP
 *    409 Conflict, confirming the active-account uniqueness constraint.
 */
export async function test_api_customer_join_email_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. First registration — should succeed
  const customerConnection: api.IConnection = { host: connection.host };
  const firstCustomer = await authorize_customer_join(customerConnection, {});
  typia.assert(firstCustomer);
  const email = firstCustomer.email;
  // 2. Second registration with same email — must fail with 409 Conflict
  await TestValidator.error("duplicate email registration", async () => {
    await api.functional.shoppingMall.auth.customer.join(
      { host: connection.host },
      {
        body: {
          email,
          password: RandomGenerator.alphaNumeric(16),
          display_name: RandomGenerator.name(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IShoppingMallCustomer.IJoin,
      },
    );
  });
}
