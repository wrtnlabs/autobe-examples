import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsGuest";
import type { IHrmsGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsGuestSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_sessions_filter_expired_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a guest account to create initial session
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(guestAuth);
  // 2. Query for expired sessions (may be empty if no sessions expired)
  const expiredResponse = await api.functional.hrms.guest.guest_sessions.index(
    guestConnection,
    {
      body: {
        expired_status: "expired" satisfies "expired" | "non_expired",
      },
    },
  );
  typia.assert(expiredResponse);
  typia.assert(expiredResponse.pagination);
  typia.assert(expiredResponse.data);
  // 3. Query for non-expired sessions
  const nonExpiredResponse =
    await api.functional.hrms.guest.guest_sessions.index(guestConnection, {
      body: {
        expired_status: "non_expired" satisfies "expired" | "non_expired",
      },
    });
  typia.assert(nonExpiredResponse);
  typia.assert(nonExpiredResponse.pagination);
  typia.assert(nonExpiredResponse.data);
  // 4. Validate pagination metadata reflects filtered results
  const expiredCount = expiredResponse.data.length;
  const nonExpiredCount = nonExpiredResponse.data.length;
  const totalCount = expiredCount + nonExpiredCount;
  TestValidator.equals(
    "expired pagination records matches data length",
    expiredResponse.pagination.records,
    expiredCount,
  );
  TestValidator.equals(
    "non-expired pagination records matches data length",
    nonExpiredResponse.pagination.records,
    nonExpiredCount,
  );
  // 5. Validate that each session in expired response is actually expired
  for (const session of expiredResponse.data) {
    typia.assert(session);
    typia.assert(session.expired_at);
    const sessionExpiredAt = new Date(session.expired_at);
    const now = new Date();
    TestValidator.predicate(
      "expired session has expired_at before now",
      sessionExpiredAt <= now,
    );
  }
  // 6. Validate that each session in non-expired response is still active
  for (const session of nonExpiredResponse.data) {
    typia.assert(session);
    typia.assert(session.expired_at);
    const sessionExpiredAt = new Date(session.expired_at);
    const now = new Date();
    TestValidator.predicate(
      "non-expired session has expired_at after now",
      sessionExpiredAt > now,
    );
  }
  // 7. Validate guest reference is present for each session
  for (const session of [...expiredResponse.data, ...nonExpiredResponse.data]) {
    typia.assert(session);
    typia.assert(session.guest);
    typia.assert(session.guest.id);
    typia.assert(session.guest.device_fingerprint);
    typia.assert(session.guest.created_at);
    typia.assert(session.guest.ip_address);
  }
}