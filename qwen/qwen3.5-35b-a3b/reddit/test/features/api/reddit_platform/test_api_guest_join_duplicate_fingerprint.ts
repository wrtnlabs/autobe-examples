import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_duplicate_fingerprint(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first guest session with unique fingerprint
  const firstConnection: api.IConnection = { host: connection.host };
  const firstSession = await authorize_guest_join(firstConnection, {
    body: {
      fingerprint: "test-fingerprint-123",
      href: "https://reddit.com/r/popular",
      referrer: "https://google.com",
      ip: "192.168.1.1",
    } satisfies IRedditPlatformGuest.IJoin,
  });
  typia.assert(firstSession);
  const sessionId = firstSession.id;
  const firstUpdatedAt = firstSession.updated_at;
  // 2. Create second guest session with same fingerprint but different browser context
  const secondConnection: api.IConnection = { host: connection.host };
  const secondSession = await authorize_guest_join(secondConnection, {
    body: {
      fingerprint: "test-fingerprint-123",
      href: "https://reddit.com/r/askreddit",
      referrer: "https://twitter.com",
      ip: "192.168.1.2",
    } satisfies IRedditPlatformGuest.IJoin,
  });
  typia.assert(secondSession);
  // 3. Validate session ID consistency - no duplicates created
  TestValidator.equals("session ID consistent", secondSession.id, sessionId);
  // 4. Verify updated_at was refreshed to show session activity
  TestValidator.notEquals(
    "updated_at refreshed",
    firstUpdatedAt,
    secondSession.updated_at,
  );
  // 5. Verify all session fields match (except timestamps that should update)
  TestValidator.equals(
    "fingerprint consistent",
    secondSession.fingerprint,
    firstSession.fingerprint,
  );
  TestValidator.equals(
    "created_at unchanged",
    secondSession.created_at,
    firstSession.created_at,
  );
  TestValidator.equals(
    "deleted_at consistent",
    secondSession.deleted_at,
    firstSession.deleted_at,
  );
}
