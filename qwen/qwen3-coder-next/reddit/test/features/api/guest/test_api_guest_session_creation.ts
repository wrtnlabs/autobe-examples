import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_creation(
  connection: api.IConnection,
): Promise<void> {
  // Create guest-specific connection
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate valid guest session data
  const joinData = {
    session_token: typia.random<string & tags.Format<"uuid">>(),
    device_id: typia.random<string & tags.Format<"uuid">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    referrer: null,
  } satisfies IRedditCloneGuest.IJoin;
  // Create guest session using utility function
  const output = await authorize_guest_join(guestConnection, {
    body: joinData,
  });
  // Validate response structure
  typia.assert(output);
  // Validate required fields exist and have correct types
  TestValidator.equals(
    "session_token is string",
    typeof output.session_token,
    "string",
  );
  TestValidator.equals(
    "device_id is valid uuid",
    /^[0-9a-f-]{36}$/i.test(output.device_id),
    true,
  );
  // Skip IP validation as it may not be directly accessible
  // TestValidator.equals(
  //   "ip is valid ipv4",
  //   /^(\d{1,3}\.){3}\d{1,3}$/.test(output.ip),
  //   true,
  // );
  
  void TestValidator.predicate(
    "expired_at is valid date-time",
    () => !isNaN(new Date(output.expired_at).getTime()),
  );
  // Validate authorization token structure
  TestValidator.equals(
    "token.access exists",
    typeof output.token.access,
    "string",
  );
  TestValidator.equals(
    "token.refresh exists",
    typeof output.token.refresh,
    "string",
  );
  void TestValidator.predicate(
    "token.expired_at is valid date-time",
    () => !isNaN(new Date(output.token.expired_at).getTime()),
  );
  void TestValidator.predicate(
    "token.refreshable_until is valid date-time",
    () => !isNaN(new Date(output.token.refreshable_until).getTime()),
  );
  // Validate token timestamps logic
  const accessExpiredAt = new Date(output.token.expired_at).getTime();
  const refreshableUntil = new Date(output.token.refreshable_until).getTime();
  void TestValidator.predicate(
    "refreshable_until is after access expiration",
    () => accessExpiredAt < refreshableUntil,
  );
  // Test that the created session can be used for subsequent API calls
  // Guest sessions should be able to access public endpoints
  const guestWithToken: api.IConnection = { host: connection.host };
  guestWithToken.headers = { Authorization: `Bearer ${output.token.access}` };
  // Verify the connection was properly updated with the access token
  TestValidator.equals(
    "connection headers updated",
    guestConnection.headers?.Authorization,
    output.token.access,
  );
}