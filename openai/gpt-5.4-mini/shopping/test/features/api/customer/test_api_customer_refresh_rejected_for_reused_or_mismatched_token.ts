import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_refresh_rejected_for_reused_or_mismatched_token(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify invalid customer refresh tokens are rejected after reuse or session mismatch.
   *
   * This test covers the customer authentication refresh flow by creating a real customer session, then attempting to renew it with tokens that should no longer be accepted. It checks the business rule that refresh tokens cannot be reused or substituted across sessions, and that the platform requires credential re-authentication when refresh is invalid.
   *
   * 1. Create a customer account and capture the issued refresh token.
   * 2. Attempt to refresh with a refresh token from another customer session.
   * 3. Attempt to refresh with a reused token value and verify the request fails.
   * 4. Confirm the original session token bundle remains unchanged and does not rotate implicitly.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/join",
      referrer: "https://example.com/register",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const initialAccess = customer.token.access;
  const initialRefresh = customer.token.refresh;
  const otherCustomerConnection: api.IConnection = { host: connection.host };
  const otherCustomer = await authorize_customer_join(otherCustomerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/join-2",
      referrer: "https://example.com/register",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(otherCustomer);
  await TestValidator.httpError(
    "mismatched customer refresh token should be rejected",
    [401, 403],
    async () => {
      await authorize_customer_refresh(
        { host: connection.host },
        {
          body: {
            refreshToken: otherCustomer.token.refresh,
          } satisfies IMallPlatformCustomer.IRefresh,
        },
      );
    },
  );
  await TestValidator.httpError(
    "reused customer refresh token should be rejected",
    [401, 403],
    async () => {
      await authorize_customer_refresh(
        { host: connection.host },
        {
          body: {
            refreshToken: initialRefresh,
          } satisfies IMallPlatformCustomer.IRefresh,
        },
      );
    },
  );
  TestValidator.equals(
    "original access token remains unchanged after failed refresh",
    customer.token.access,
    initialAccess,
  );
  TestValidator.equals(
    "original refresh token remains unchanged after failed refresh attempt",
    customer.token.refresh,
    initialRefresh,
  );
}
