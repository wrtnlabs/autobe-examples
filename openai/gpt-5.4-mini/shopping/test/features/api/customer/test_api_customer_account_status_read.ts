import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Validate the authenticated customer account status endpoint.
 *
 * This test verifies that a newly registered customer can access the current account status projection using an authenticated session. It confirms the endpoint returns only the minimal seller-account status shape, including the stored approval state and optional rejection reason, while excluding unrelated identifiers, credentials, profile fields, or snapshot side effects.
 *
 * 1. Register a customer account and establish an authenticated connection.
 * 2. Call the current account status endpoint using the authenticated connection.
 * 3. Assert the response matches the seller-account status projection exactly and is read-only.
 */
export async function test_api_customer_account_status_read(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!",
      href: "https://example.com/signup",
      referrer: "https://example.com/landing",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const first =
    await api.functional.mallPlatform.customer.account.status.at(
      customerConnection,
    );
  typia.assert(first);
  TestValidator.predicate(
    "account status payload contains only expected fields",
    () =>
      Object.keys(first).every(
        (key) => key === "status" || key === "rejectionReason",
      ) && Object.keys(first).length === 2,
  );
  TestValidator.equals(
    "rejection reason matches status",
    first.status === "rejected" ? first.rejectionReason : null,
    first.rejectionReason,
  );
  const second =
    await api.functional.mallPlatform.customer.account.status.at(
      customerConnection,
    );
  typia.assert(second);
  TestValidator.equals("read-only status response", second, first);
}
