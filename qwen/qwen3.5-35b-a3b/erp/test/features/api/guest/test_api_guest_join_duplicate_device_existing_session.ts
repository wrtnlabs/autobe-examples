import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_duplicate_device_existing_session(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create initial guest session with fixed credentials
  const actorConnection: api.IConnection = { host: connection.host };
  const existingGuest = await api.functional.hrmPlatform.auth.guest.join(
    actorConnection,
    {
      body: {
        email: "existingguest@example.com",
        password: "SecurePass123!",
        name: "Existing Guest User",
        href: "https://example.com/",
        referrer: "https://google.com",
        ip: "192.168.1.100",
      } satisfies IHrmPlatformGuest.IJoin,
    },
  );
  typia.assert(existingGuest);
  // Store session identifiers for duplicate test
  const originalSessionId = existingGuest.session_id;
  const originalDeviceIdentifier = existingGuest.device_identifier;
  const originalIpAddress = existingGuest.ip_address;
  const originalCreatedAt = existingGuest.created_at;
  // 2. Create another session with the SAME credentials and ip_address
  // This should return the existing guest/session rather than creating a duplicate
  const duplicateConnection: api.IConnection = { host: connection.host };
  const duplicateGuest = await api.functional.hrmPlatform.auth.guest.join(
    duplicateConnection,
    {
      body: {
        email: "existingguest@example.com",
        password: "SecurePass123!",
        name: "Existing Guest User",
        href: "https://example.com/",
        referrer: "https://google.com",
        ip: "192.168.1.100",
      } satisfies IHrmPlatformGuest.IJoin,
    },
  );
  typia.assert(duplicateGuest);
  // 3. Verify duplicate session handling
  TestValidator.equals(
    "organization_id is null for guest",
    duplicateGuest.organization_id,
    null,
  );
  TestValidator.equals(
    "device_identifier matches original",
    duplicateGuest.device_identifier,
    originalDeviceIdentifier,
  );
  TestValidator.equals(
    "ip_address matches original",
    duplicateGuest.ip_address,
    originalIpAddress,
  );
  TestValidator.equals(
    "created_at unchanged (session not duplicated)",
    duplicateGuest.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "access token present",
    duplicateGuest.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh token present",
    duplicateGuest.token.refresh.length > 0,
    true,
  );
  TestValidator.equals(
    "access token expiration present",
    duplicateGuest.token.expired_at !== undefined,
    true,
  );
  TestValidator.equals(
    "refreshable until present",
    duplicateGuest.token.refreshable_until !== undefined,
    true,
  );
  // session_id may be the same or null if session was cleaned up
  if (duplicateGuest.session_id !== null) {
    TestValidator.equals(
      "session_id exists and matches original",
      duplicateGuest.session_id,
      originalSessionId ?? duplicateGuest.session_id,
    );
  }
}
