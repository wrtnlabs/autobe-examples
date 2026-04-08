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
 * Verifies rejected account status exposes the stored rejection reason.
 *
 * This test covers the current-account status endpoint for an authenticated customer session. It validates that the response reports the rejection outcome and preserves the explanation so the caller can understand why access was denied and whether a new registration request should be submitted.
 *
 * 1. Register a customer account and establish an authenticated customer session.
 * 2. Call the current account status endpoint for the authenticated customer.
 * 3. Validate the response contains the rejected status and a rejection reason.
 * 4. Confirm the endpoint behaves as a read-only self-scope account status lookup.
 */
export async function test_api_customer_account_status_rejected_reason(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: null,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(joined);
  const status =
    await api.functional.mallPlatform.customer.account.status.at(
      customerConnection,
    );
  typia.assert(status);
  TestValidator.equals(
    "account status should be rejected",
    status.status,
    "rejected",
  );
  TestValidator.predicate(
    "rejection reason should be exposed",
    status.rejectionReason !== null && status.rejectionReason.length > 0,
  );
}
