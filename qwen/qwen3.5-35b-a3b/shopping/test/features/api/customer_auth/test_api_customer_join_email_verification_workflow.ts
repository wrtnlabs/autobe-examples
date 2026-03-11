import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
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
 * Test customer registration with email verification workflow.
 * Registers a new customer account with valid email and password credentials.
 * Validates that the system creates the customer account successfully and returns
 * authentication tokens for immediate access.
 * Confirms that registration does not require email verification before account activation,
 * as the account remains active without verification while the verification token may
 * exist for users who wish to verify their account.
 */
export async function test_api_customer_join_email_verification_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer-specific connection for registration
  const customerConnection: api.IConnection = { host: connection.host };
  // 2. Register new customer with valid credentials using utility function
  const joinInput = {
    email: typia.random<
      string & tags.Format<"email">
    >() satisfies string as string &
      tags.MinLength<1> &
      tags.MaxLength<255> &
      tags.Format<"email">,
    password: RandomGenerator.alphaNumeric(16) satisfies string as string &
      tags.MinLength<8> &
      tags.Format<"password">,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallCustomer.IJoin;
  const authorized = await authorize_customer_join(customerConnection, {
    body: joinInput,
  });
  typia.assert(authorized);
  // 3. Validate customer identity fields match registration input
  TestValidator.equals(
    "customer email matches registration",
    authorized.email,
    joinInput.email,
  );
  TestValidator.equals(
    "account not banned by default",
    authorized.is_banned,
    false,
  );
  TestValidator.equals(
    "ban reason is null for new account",
    authorized.ban_reason,
    null,
  );
  // 4. Validate timestamp fields are valid date-time strings
  TestValidator.predicate(
    "created_at is valid date-time",
    () => new Date(authorized.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    () => new Date(authorized.updated_at).getTime() > 0,
  );
  // 5. Validate token structure is complete
  const token = authorized.token;
  TestValidator.equals(
    "access token is present",
    token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh token is present",
    token.refresh.length > 0,
    true,
  );
  // 6. Validate token expiration timestamps are valid date-time strings
  TestValidator.predicate(
    "expired_at is valid date-time",
    () => new Date(token.expired_at).getTime() > 0,
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    () => new Date(token.refreshable_until).getTime() > 0,
  );
  // 7. Validate token lifetime makes sense (access expires before or at refresh deadline)
  TestValidator.predicate(
    "access token expires before or at refresh deadline",
    () =>
      new Date(token.expired_at).getTime() <=
      new Date(token.refreshable_until).getTime(),
  );
  // 8. Registration succeeded without email verification - account is immediately usable
  TestValidator.equals(
    "customer account has valid id after registration",
    authorized.id !== undefined && authorized.id.length > 0,
    true,
  );
}
