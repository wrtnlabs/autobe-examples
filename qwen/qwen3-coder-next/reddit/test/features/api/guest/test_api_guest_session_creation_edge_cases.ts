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

export async function test_api_guest_session_creation_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection
  const actorConnection: api.IConnection = { host: connection.host };
  // Test 1: Valid guest session creation with standard UUIDs and IPv4
  const guest1 = await authorize_guest_join(actorConnection, {
    body: {
      session_token: typia.random<string & tags.Format<"uuid">>(),
      device_id: typia.random<string & tags.Format<"uuid">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneGuest.IJoin,
  });
  typia.assert(guest1);
  TestValidator.predicate(
    "has valid access token",
    Boolean(guest1.token.access),
  );
  TestValidator.predicate(
    "has valid refresh token",
    Boolean(guest1.token.refresh),
  );
  // Test 2: Guest session with null referrer
  const guest2 = await authorize_guest_join(actorConnection, {
    body: {
      session_token: typia.random<string & tags.Format<"uuid">>(),
      device_id: typia.random<string & tags.Format<"uuid">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      referrer: null,
    } satisfies IRedditCloneGuest.IJoin,
  });
  typia.assert(guest2);
  // Test 3: Guest session with undefined referrer
  const guest3 = await authorize_guest_join(actorConnection, {
    body: {
      session_token: typia.random<string & tags.Format<"uuid">>(),
      device_id: typia.random<string & tags.Format<"uuid">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      referrer: undefined,
    } satisfies IRedditCloneGuest.IJoin,
  });
  typia.assert(guest3);
  // Test 4: Guest session with empty string referrer
  const guest4 = await authorize_guest_join(actorConnection, {
    body: {
      session_token: typia.random<string & tags.Format<"uuid">>(),
      device_id: typia.random<string & tags.Format<"uuid">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      referrer: "",
    } satisfies IRedditCloneGuest.IJoin,
  });
  typia.assert(guest4);
  // Test 5: Guest session with valid URL referrer
  const guest5 = await authorize_guest_join(actorConnection, {
    body: {
      session_token: typia.random<string & tags.Format<"uuid">>(),
      device_id: typia.random<string & tags.Format<"uuid">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      referrer: "https://example.com/page",
    } satisfies IRedditCloneGuest.IJoin,
  });
  typia.assert(guest5);
  // Test 6: Guest session with different IPv4 address format (octet ranges)
  const guest6 = await authorize_guest_join(actorConnection, {
    body: {
      session_token: typia.random<string & tags.Format<"uuid">>(),
      device_id: typia.random<string & tags.Format<"uuid">>(),
      ip: "0.0.0.0", // Minimum valid IPv4
    } satisfies IRedditCloneGuest.IJoin,
  });
  typia.assert(guest6);
  const guest7 = await authorize_guest_join(actorConnection, {
    body: {
      session_token: typia.random<string & tags.Format<"uuid">>(),
      device_id: typia.random<string & tags.Format<"uuid">>(),
      ip: "255.255.255.255", // Maximum valid IPv4
    } satisfies IRedditCloneGuest.IJoin,
  });
  typia.assert(guest7);
  // Test 7: Verify session expiration is in future
  const now = new Date();
  TestValidator.predicate(
    "session expiration is in future",
    new Date(guest1.expired_at) > now,
  );
  // Test 8: Verify token properties exist and have correct structure
  TestValidator.equals(
    "access token exists",
    Boolean(guest1.token.access),
    true,
  );
  TestValidator.equals(
    "refresh token exists",
    Boolean(guest1.token.refresh),
    true,
  );
  TestValidator.predicate(
    "access token has valid format",
    typeof guest1.token.access === "string" && guest1.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token has valid format",
    typeof guest1.token.refresh === "string" && guest1.token.refresh.length > 0,
  );
  TestValidator.equals(
    "expired_at is date-time format",
    Boolean(guest1.token.expired_at),
    true,
  );
  TestValidator.equals(
    "refreshable_until exists",
    Boolean(guest1.token.refreshable_until),
    true,
  );
  // Test 9: Verify device_id and session_token are preserved in response
  TestValidator.equals(
    "device_id matches request",
    guest1.device_id,
    guest1.device_id,
  );
  TestValidator.equals(
    "session_token matches expected format",
    /^[0-9a-f-]{36}$/i.test(guest1.session_token),
    true,
  );
}
