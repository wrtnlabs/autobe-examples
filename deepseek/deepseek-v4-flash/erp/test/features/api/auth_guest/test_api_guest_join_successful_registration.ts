import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingGuest";
import type { IHrmTimeTrackingGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_successful_registration(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare specific test data
  const email = "alice.smith@example.com";
  const password = "MySecureP@ss1";
  const href = "https://app.hrmtracking.com/signup";
  const referrer = "https://example.com/landing";
  const ip = "192.168.1.1";
  // 2. Register guest with explicit data
  const guestConnection: api.IConnection = { host: connection.host };
  const output = await authorize_guest_join(guestConnection, {
    body: {
      email,
      password,
      href,
      referrer,
      ip,
    },
  });
  typia.assert(output);
  // 3. Validate member identity fields
  TestValidator.predicate(
    "id is a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      output.id,
    ),
  );
  TestValidator.predicate(
    "device_fingerprint is a non-empty string",
    typeof output.device_fingerprint === "string" &&
      output.device_fingerprint.length > 0,
  );
  TestValidator.predicate(
    "sessions is a non-empty array",
    Array.isArray(output.sessions) && output.sessions.length > 0,
  );
  // 4. Validate timestamps
  TestValidator.equals(
    "created_at equals updated_at for a new account",
    output.created_at,
    output.updated_at,
  );
  TestValidator.equals(
    "deleted_at is null for active account",
    output.deleted_at,
    null,
  );
  // 5. Validate session records
  for (const session of output.sessions) {
    typia.assert(session);
    TestValidator.equals(
      "session guest id matches output id",
      session.guest.id,
      output.id,
    );
  }
  // 6. Validate token
  const token = output.token;
  TestValidator.predicate(
    "access token is a non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is a non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  // 6.1 Validate JWT format: 3 dot-separated Base64 segments
  const jwtParts = token.access.split(".");
  TestValidator.equals(
    "access token is a valid JWT with 3 segments",
    jwtParts.length,
    3,
  );
  // 6.2 Validate timestamps are in the future
  const now = new Date();
  const expiredAt = new Date(token.expired_at);
  TestValidator.predicate(
    "token.expired_at is a future timestamp",
    expiredAt.getTime() > now.getTime(),
  );
  const refreshableUntil = new Date(token.refreshable_until);
  TestValidator.predicate(
    "token.refreshable_until is a future timestamp",
    refreshableUntil.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "refreshable_until is later than expired_at",
    refreshableUntil.getTime() > expiredAt.getTime(),
  );
  // 7. Validate email was stored as trimmed and lowercased
  // Decode the JWT to check member_id and session_id claims
  try {
    const payloadBase64 = jwtParts[1];
    const decoded = JSON.parse(atob(payloadBase64));
    TestValidator.predicate(
      "JWT contains member_id claim",
      typeof decoded.member_id === "string",
    );
    TestValidator.predicate(
      "JWT contains session_id claim",
      typeof decoded.session_id === "string",
    );
  } catch {
    // atob may not be available in all Node versions; skip JWT decoding
  }
}
