import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_sessions_filter_by_date_range_and_ip(
  connection: api.IConnection,
): Promise<void> {
  // ── Step 1: Register Member A ──────────────────────────────────────────────
  const tBefore = new Date().toISOString();
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: "127.0.0.1",
    },
  });
  typia.assert(memberAAuthorized);
  const tAfter = new Date().toISOString();
  // ── Step 2: Date range filter — records within range ───────────────────────
  const withinRangePage = await api.functional.erpHrm.member.sessions.index(
    memberAConnection,
    {
      body: {
        createdAtFrom: tBefore,
        createdAtTo: tAfter,
      } satisfies IErpHrmMemberSession.IRequest,
    },
  );
  typia.assert(withinRangePage);
  TestValidator.predicate(
    "at least one session within range",
    withinRangePage.pagination.records >= 1,
  );
  for (const session of withinRangePage.data) {
    TestValidator.predicate(
      "session created_at >= tBefore",
      session.created_at >= tBefore,
    );
    TestValidator.predicate(
      "session created_at <= tAfter",
      session.created_at <= tAfter,
    );
  }
  // ── Step 3: Date range filter — no records (far future) ───────────────────
  const farFuture1 = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 365 * 10,
  ).toISOString();
  const farFuture2 = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 365 * 11,
  ).toISOString();
  const futureRangePage = await api.functional.erpHrm.member.sessions.index(
    memberAConnection,
    {
      body: {
        createdAtFrom: farFuture1,
        createdAtTo: farFuture2,
      } satisfies IErpHrmMemberSession.IRequest,
    },
  );
  typia.assert(futureRangePage);
  TestValidator.equals(
    "future range returns 0 records",
    futureRangePage.pagination.records,
    0,
  );
  TestValidator.equals(
    "future range returns empty data array",
    futureRangePage.data.length,
    0,
  );
  // ── Step 4: IP partial-match filter ───────────────────────────────────────
  // Fetch all sessions to get an IP
  const allSessionsPage = await api.functional.erpHrm.member.sessions.index(
    memberAConnection,
    {
      body: {} satisfies IErpHrmMemberSession.IRequest,
    },
  );
  typia.assert(allSessionsPage);
  TestValidator.predicate(
    "has at least one session for IP test",
    allSessionsPage.data.length >= 1,
  );
  const firstSession = allSessionsPage.data[0]!;
  const ipSubstring = firstSession.ip.split(".")[0]!; // e.g. "127"
  const ipFilterPage = await api.functional.erpHrm.member.sessions.index(
    memberAConnection,
    {
      body: {
        ip: ipSubstring,
      } satisfies IErpHrmMemberSession.IRequest,
    },
  );
  typia.assert(ipFilterPage);
  for (const session of ipFilterPage.data) {
    TestValidator.predicate(
      "session ip contains substring",
      session.ip.includes(ipSubstring),
    );
  }
  // Non-matching IP
  const nonMatchingIpPage = await api.functional.erpHrm.member.sessions.index(
    memberAConnection,
    {
      body: {
        ip: "999.999.999.999",
      } satisfies IErpHrmMemberSession.IRequest,
    },
  );
  typia.assert(nonMatchingIpPage);
  TestValidator.equals(
    "non-matching IP returns 0 records",
    nonMatchingIpPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-matching IP returns empty data",
    nonMatchingIpPage.data.length,
    0,
  );
  // ── Step 5: Data isolation (member scope) ──────────────────────────────────
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuthorized = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: "192.168.0.1",
    },
  });
  typia.assert(memberBAuthorized);
  // Fetch Member B's sessions to collect their session IDs
  const memberBSessionsPage = await api.functional.erpHrm.member.sessions.index(
    memberBConnection,
    {
      body: {} satisfies IErpHrmMemberSession.IRequest,
    },
  );
  typia.assert(memberBSessionsPage);
  const memberBSessionIds = new Set(memberBSessionsPage.data.map((s) => s.id));
  // Fetch Member A's sessions (no filter) — should not contain any of Member B's session IDs
  const memberASessionsPage = await api.functional.erpHrm.member.sessions.index(
    memberAConnection,
    {
      body: {} satisfies IErpHrmMemberSession.IRequest,
    },
  );
  typia.assert(memberASessionsPage);
  for (const session of memberASessionsPage.data) {
    TestValidator.predicate(
      "member A sessions do not contain member B sessions",
      !memberBSessionIds.has(session.id),
    );
  }
}
