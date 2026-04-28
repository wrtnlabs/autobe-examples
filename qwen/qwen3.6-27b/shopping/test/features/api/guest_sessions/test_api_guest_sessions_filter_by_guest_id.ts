import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformGuest";
import type { IEcommercePlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test filtering guest sessions by a specific guest account UUID.
 *
 * Validates the session filtering functionality by confirming that only sessions belonging to a specific guest account are returned when filtering by guest_id. Ensures pagination metadata accurately reflects the filtered result set.
 *
 * 1. Guest joins the platform using device fingerprint authentication.
 * 2. Guest filters sessions by their own guest_id.
 * 3. Validates that all returned sessions belong to the specified guest.
 * 4. Validates session details and pagination metadata.
 */
export async function test_api_guest_sessions_filter_by_guest_id(
  connection: api.IConnection,
) {
  // 1. Guest joins the platform
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {});
  typia.assert(guest);
  // 2. Filter sessions by guest_id
  const body = {
    guest_id: guest.id,
  } satisfies IEcommercePlatformGuestSession.IRequest;
  const sessions = await api.functional.ecommercePlatform.guest.sessions.index(
    guestConnection,
    { body },
  );
  typia.assert(sessions);
  // 3. Validate all returned sessions belong to the filtered guest
  TestValidator.predicate(
    "all sessions belong to filtered guest",
    sessions.data.every((session) => session.guest.id === guest.id),
  );
  // 4. Validate pagination reflects filtered results
  TestValidator.equals(
    "total records matches data array length",
    sessions.pagination.records,
    sessions.data.length,
  );
  // 5. Validate each session has complete details
  for (const session of sessions.data) {
    typia.assert(session);
    TestValidator.predicate("has valid ip address", session.ip.length > 0);
    TestValidator.predicate("has href", session.href.length > 0);
    TestValidator.predicate("has referrer", session.referrer.length > 0);
    TestValidator.predicate(
      "has created_at timestamp",
      session.created_at.length > 0,
    );
    TestValidator.predicate(
      "has expired_at timestamp",
      session.expired_at.length > 0,
    );
  }
}
