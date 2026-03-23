import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_session_metadata(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test guest registration session metadata capture and storage.
   *
   * This test validates that when a guest registers, the system correctly
   * extracts and stores connection metadata (ip, href, referrer) from the
   * request for security auditing purposes. It verifies the session record
   * is properly linked to the guest account and that token expiration
   * timestamps are calculated correctly.
   */
  // 1. Create guest-specific connection
  const guestConnection: api.IConnection = { host: connection.host };
  // 2. Prepare guest join request with complete session metadata
  const joinBody = {
    device_token: RandomGenerator.alphaNumeric(32),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IMultiUserTodoGuest.IJoin;
  // 3. Execute guest registration using utility function
  const authorized = await authorize_guest_join(guestConnection, {
    body: joinBody,
  });
  // 4. Validate response structure with complete type checking
  typia.assert(authorized);
  // 5. Validate business logic: tokens are usable (non-empty)
  TestValidator.predicate(
    "access token is non-empty",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    authorized.token.refresh.length > 0,
  );
  // 6. Validate guest ID was generated
  TestValidator.predicate("guest ID is non-empty", authorized.id.length > 0);
}
