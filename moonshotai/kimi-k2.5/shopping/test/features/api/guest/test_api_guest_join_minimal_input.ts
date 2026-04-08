import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_minimal_input(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for our test to avoid affecting the base connection
  const guestConnection: api.IConnection = { host: connection.host };
  // Create a guest session with minimal input - only required fields (href and referrer)
  // The ip field is omitted to test server-side IP detection fallback
  const body = {
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies Omit<IEcommerceMallGuest.IJoin, "ip">;
  // Call the API directly to test minimal input (without ip field)
  const guestSession = await api.functional.ecommerceMall.auth.guest.join(
    guestConnection,
    { body: body as IEcommerceMallGuest.IJoin },
  );
  // Complete runtime validation of the response structure
  typia.assert(guestSession);
  // Verify the Authorization header was automatically set on the connection (business logic check)
  TestValidator.equals(
    "Authorization header set to access token",
    guestConnection.headers?.Authorization,
    guestSession.token.access,
  );
}
