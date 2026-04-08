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
 * Verifies that customer session logout is safe to call repeatedly after the session has already ended.
 *
 * This test covers the repeated logout behavior for a customer session and ensures the endpoint completes cleanly even when the same session context is reused after the first logout. It also checks that customer authorization data remains unchanged by the repeated logout flow.
 *
 * 1. Register a customer and capture the issued authorization payload.
 * 2. Log out the authenticated customer session once.
 * 3. Call logout again using the same session context.
 * 4. Confirm the authorization payload values remain unchanged in memory.
 */
export async function test_api_customer_session_logout_after_already_ended_session(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const sessionConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorized.token.access,
    },
  };
  const before = {
    id: authorized.id,
    email: authorized.email,
    status: authorized.status,
    created_at: authorized.created_at,
    updated_at: authorized.updated_at,
    deleted_at: authorized.deleted_at,
    token: {
      access: authorized.token.access,
      refresh: authorized.token.refresh,
      expired_at: authorized.token.expired_at,
      refreshable_until: authorized.token.refreshable_until,
    },
  };
  await api.functional.mallPlatform.customer.sessions.logout.erase(
    sessionConnection,
  );
  await api.functional.mallPlatform.customer.sessions.logout.erase(
    sessionConnection,
  );
  TestValidator.equals(
    "customer id should remain unchanged",
    authorized.id,
    before.id,
  );
  TestValidator.equals(
    "customer email should remain unchanged",
    authorized.email,
    before.email,
  );
  TestValidator.equals(
    "customer status should remain unchanged",
    authorized.status,
    before.status,
  );
  TestValidator.equals(
    "customer created_at should remain unchanged",
    authorized.created_at,
    before.created_at,
  );
  TestValidator.equals(
    "customer updated_at should remain unchanged",
    authorized.updated_at,
    before.updated_at,
  );
  TestValidator.equals(
    "customer deleted_at should remain unchanged",
    authorized.deleted_at,
    before.deleted_at,
  );
  TestValidator.equals(
    "customer access token should remain unchanged",
    authorized.token.access,
    before.token.access,
  );
  TestValidator.equals(
    "customer refresh token should remain unchanged",
    authorized.token.refresh,
    before.token.refresh,
  );
  TestValidator.equals(
    "customer access expiration should remain unchanged",
    authorized.token.expired_at,
    before.token.expired_at,
  );
  TestValidator.equals(
    "customer refresh window should remain unchanged",
    authorized.token.refreshable_until,
    before.token.refreshable_until,
  );
}
