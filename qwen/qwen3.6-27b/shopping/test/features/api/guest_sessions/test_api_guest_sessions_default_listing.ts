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
 * Test default listing of guest sessions with pagination validation.
 *
 * Validates the complete guest session listing flow including authentication and pagination. Ensures that default sorting by created_at DESC is applied, pagination metadata is accurate, and each session record contains the required fields.
 *
 * 1. Authenticate as a guest using authorize_guest_join.
 * 2. Call the guest sessions index endpoint with minimal parameters.
 * 3. Validate the pagination response structure.
 * 4. Confirm sessions are sorted by created_at descending.
 */
export async function test_api_guest_sessions_default_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest authentication
  const guestConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_guest_join(guestConnection, {
    body: {} satisfies DeepPartial<IEcommercePlatformGuest.IJoin>,
  });
  typia.assert(authResponse);
  // 2. Call guest sessions index with minimal parameters (defaults)
  const sessionsPage =
    await api.functional.ecommercePlatform.guest.sessions.index(
      guestConnection,
      {
        body: {} satisfies DeepPartial<IEcommercePlatformGuestSession.IRequest>,
      },
    );
  typia.assert(sessionsPage);
  // 3. Validate pagination metadata
  TestValidator.equals("current page", sessionsPage.pagination.current, 1);
  TestValidator.predicate(
    "limit is positive",
    sessionsPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "total records is non-negative",
    sessionsPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    sessionsPage.pagination.pages >= 0,
  );
  // 4. Validate each session record has required fields
  for (const session of sessionsPage.data) {
    TestValidator.predicate(
      "session id is UUID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        session.id,
      ),
    );
    TestValidator.predicate("session has ip address", session.ip !== undefined);
    TestValidator.predicate(
      "session has href URL",
      session.href !== undefined && session.href.length > 0,
    );
    TestValidator.predicate(
      "session has referrer URL",
      session.referrer !== undefined && session.referrer.length > 0,
    );
    TestValidator.predicate(
      "session has created_at timestamp",
      session.created_at !== undefined,
    );
    TestValidator.predicate(
      "session has expired_at timestamp",
      session.expired_at !== undefined,
    );
  }
  // 5. Validate default sorting by created_at descending (if multiple sessions exist)
  if (sessionsPage.data.length > 1) {
    for (let i = 1; i < sessionsPage.data.length; i++) {
      const prevTimestamp = new Date(
        sessionsPage.data[i - 1].created_at,
      ).getTime();
      const currTimestamp = new Date(sessionsPage.data[i].created_at).getTime();
      TestValidator.predicate(
        "sessions sorted by created_at in descending order",
        prevTimestamp >= currTimestamp,
      );
    }
  }
}
