import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer registration success with authorization payload validation.
 *
 * Validates that a brand-new customer can join the platform with a unique
 * email address and valid onboarding context, and that the server returns the
 * full authorized customer payload required for immediate authenticated access.
 *
 * The test also confirms that account identity fields and lifecycle timestamps
 * are populated, the token pair is present, and the returned account is ready
 * for immediate authenticated customer access.
 *
 * 1. Create an isolated customer connection from the base host.
 * 2. Submit a customer join request with unique credentials and onboarding context.
 * 3. Validate the returned authorized payload and token metadata.
 * 4. Confirm the response reflects an active customer account and omits deleted-at data.
 */
export async function test_api_customer_join_success(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const body = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12) + "A1!",
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IMallPlatformCustomer.IJoin;
  const authorized = await authorize_customer_join(customerConnection, {
    body,
  });
  typia.assert(authorized);
  TestValidator.equals(
    "joined email should match request",
    authorized.email,
    body.email,
  );
  TestValidator.predicate(
    "customer id should be populated",
    authorized.id.length > 0,
  );
  TestValidator.predicate(
    "account status should be populated",
    authorized.status.length > 0,
  );
  TestValidator.predicate(
    "created_at should be populated",
    authorized.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be populated",
    authorized.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at should be null for a new account",
    authorized.deleted_at,
    null,
  );
  TestValidator.predicate(
    "access token should be returned",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be returned",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at should be populated",
    authorized.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until should be populated",
    authorized.token.refreshable_until.length > 0,
  );
}
