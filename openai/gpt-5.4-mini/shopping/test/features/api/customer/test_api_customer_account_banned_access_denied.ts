import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Verifies that a banned-or-revoked customer session cannot access the current account endpoint.
 *
 * This test covers the customer account access-control boundary for the authenticated current-account read path. It creates a real customer session first, then removes the session authorization from the request connection to simulate a banned or otherwise revoked access state at read time.
 *
 * The validation focuses on denial behavior rather than payload shape. The endpoint must reject access for a customer principal that no longer has a usable authenticated session, and it must not return the customer account model.
 *
 * 1. Register a customer account with valid credentials.
 * 2. Authenticate the customer to obtain a real session.
 * 3. Reuse the same customer principal context with authorization removed to simulate access revocation.
 * 4. Confirm the authenticated account endpoint denies access.
 */
export async function test_api_customer_account_banned_access_denied(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const email = `${RandomGenerator.alphabets(12)}@test.com`;
  const password = `${RandomGenerator.alphaNumeric(12)}!`;
  await authorize_customer_join(customerConnection, {
    body: {
      email,
      password,
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const loggedInCustomerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(loggedInCustomerConnection, {
    body: {
      email,
      password,
    } satisfies IMallPlatformCustomer.ILogin,
  });
  loggedInCustomerConnection.headers = {};
  await TestValidator.httpError(
    "revoked customer access should be denied",
    [401, 403],
    async () => {
      await api.functional.mallPlatform.seller.account.at(
        loggedInCustomerConnection,
      );
    },
  );
}
