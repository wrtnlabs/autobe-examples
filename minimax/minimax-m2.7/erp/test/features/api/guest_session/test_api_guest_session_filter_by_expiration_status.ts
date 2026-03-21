import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import type { IErpHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuestSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_guest_session_filter_by_expiration_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Filter by expired=false (active sessions)
  const activeSessionsResult =
    await api.functional.erpHrm.admin.guest_sessions.index(adminConnection, {
      body: {
        expired: false,
        limit: 10,
      } satisfies IErpHrmGuestSession.IRequest,
    });
  typia.assert(activeSessionsResult);
  // 3. Filter by expired=true (expired sessions)
  const expiredSessionsResult =
    await api.functional.erpHrm.admin.guest_sessions.index(adminConnection, {
      body: {
        expired: true,
        limit: 10,
      } satisfies IErpHrmGuestSession.IRequest,
    });
  typia.assert(expiredSessionsResult);
  // 4. Validate expiration status filtering
  const now = new Date();
  // Check active sessions (expired=false) - all should have expired_at > now
  for (const session of activeSessionsResult.data) {
    const expiredAt = new Date(session.expired_at);
    TestValidator.predicate(
      `Active session ${session.id} should have expired_at > now`,
      expiredAt > now,
    );
  }
  // Check expired sessions (expired=true) - all should have expired_at < now
  for (const session of expiredSessionsResult.data) {
    const expiredAt = new Date(session.expired_at);
    TestValidator.predicate(
      `Expired session ${session.id} should have expired_at < now`,
      expiredAt < now,
    );
  }
  // 5. Verify the two result sets are different (sanity check)
  const activeIds = new Set(activeSessionsResult.data.map((s) => s.id));
  const expiredIds = new Set(expiredSessionsResult.data.map((s) => s.id));
  // Sessions in active list should not appear in expired list
  for (const id of activeIds) {
    TestValidator.predicate(
      `Active session ${id} should not appear in expired sessions`,
      !expiredIds.has(id),
    );
  }
}
