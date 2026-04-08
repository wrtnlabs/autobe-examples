import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test missing customer session lookup returns not-found behavior.
 *
 * Validates that an authenticated customer can attempt to retrieve a session
 * by UUID, and that a UUID not associated with any persisted customer session
 * is treated as inaccessible without exposing session ownership, metadata,
 * or expiration details.
 *
 * 1. Register a customer account and capture authenticated access.
 * 2. Request a customer session using a UUID that is not linked to any stored
 *    session record.
 * 3. Confirm the lookup fails as a missing/inaccessible session rather than
 *    returning session data.
 */
export async function test_api_customer_session_lookup_missing_session(
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
  const missingSessionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "missing customer session should return not-found",
    404,
    async () => {
      await api.functional.mallPlatform.customer.sessions.at(
        customerConnection,
        {
          sessionId: missingSessionId,
        },
      );
    },
  );
}
