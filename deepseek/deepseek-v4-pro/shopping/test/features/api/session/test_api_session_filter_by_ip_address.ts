import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallGuestSession";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test IP address substring filtering on session browsing for security auditing.
 *
 * Validates that the session browsing endpoint correctly supports partial IP address matching
 * as documented in the ip filter description. The endpoint should treat the ip field as a
 * substring match against the ip column (LIKE '%value%'), enabling administrators and
 * authorized actors to trace access patterns by partial IP addresses for security auditing
 * and anomaly detection purposes.
 *
 * 1. Generate a known, deterministic IPv4 address for test traceability.
 * 2. Register a customer using authorize_customer_join with the known IP, creating a session
 *    record that captures this IP address in the session table.
 * 3. Extract the first 3 octets of the known IP as the partial filter substring.
 * 4. Query sessions via the PATCH endpoint with only the ip filter set to the partial substring.
 * 5. Validate that at least one session is returned (the customer's own session).
 * 6. Validate that every returned session's ip field contains the filter substring,
 *    confirming partial matching excludes non-matching IP addresses.
 */
export async function test_api_session_filter_by_ip_address(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate a known IP address for deterministic filtering
  const knownIp = typia.random<string & tags.Format<"ipv4">>();
  // 2. Authenticate as customer with the known IP to create a session record
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: { ip: knownIp },
  });
  typia.assert(customer);
  // 3. Extract first 3 octets as partial IP filter substring
  const partialIp = knownIp.substring(0, knownIp.lastIndexOf("."));
  // 4. Query sessions using partial IP substring filter
  const result = await api.functional.shoppingMall.customer.sessions.index(
    customerConnection,
    {
      body: {
        ip: partialIp,
      } satisfies IShoppingMallGuestSession.IRequest,
    },
  );
  typia.assert(result);
  // 5. Validate at least one session is found
  TestValidator.predicate(
    "at least one session returned for partial IP filter",
    result.data.length > 0,
  );
  // 6. Validate every returned session's IP contains the filter substring
  for (const session of result.data) {
    TestValidator.predicate(
      "session ip contains filter substring",
      session.ip.includes(partialIp),
    );
  }
}
