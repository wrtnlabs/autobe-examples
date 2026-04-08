import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_sessions_search_and_date_filters(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      displayName: RandomGenerator.name(),
      href: "https://example.com/erp/member/sessions",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  const firstPage = await api.functional.erpHrmTime.member.sessions.index(
    memberConnection,
    {
      body: { page: 1, limit: 100 } satisfies IErpHrmTimeMemberSession.IRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.equals(
    "pagination current page",
    firstPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination records cover returned rows",
    firstPage.pagination.records >= firstPage.data.length,
  );
  TestValidator.predicate(
    "current member has at least one session",
    firstPage.data.length >= 1,
  );
  const sample = firstPage.data[0];
  const searchByIp = await api.functional.erpHrmTime.member.sessions.index(
    memberConnection,
    {
      body: {
        search: sample.ip,
        page: 1,
        limit: 100,
      } satisfies IErpHrmTimeMemberSession.IRequest,
    },
  );
  typia.assert(searchByIp);
  TestValidator.predicate(
    "search by ip returns matching sessions",
    searchByIp.data.every((row) =>
      row.ip.toLowerCase().includes(sample.ip.toLowerCase()),
    ),
  );
  const searchByHref = await api.functional.erpHrmTime.member.sessions.index(
    memberConnection,
    {
      body: {
        search: sample.href,
        page: 1,
        limit: 100,
      } satisfies IErpHrmTimeMemberSession.IRequest,
    },
  );
  typia.assert(searchByHref);
  TestValidator.predicate(
    "search by href returns matching sessions",
    searchByHref.data.every((row) =>
      row.href.toLowerCase().includes(sample.href.toLowerCase()),
    ),
  );
  const searchByReferrer =
    await api.functional.erpHrmTime.member.sessions.index(memberConnection, {
      body: {
        search: sample.referrer,
        page: 1,
        limit: 100,
      } satisfies IErpHrmTimeMemberSession.IRequest,
    });
  typia.assert(searchByReferrer);
  TestValidator.predicate(
    "search by referrer returns matching sessions",
    searchByReferrer.data.every((row) =>
      row.referrer.toLowerCase().includes(sample.referrer.toLowerCase()),
    ),
  );
  const createdAt = new Date(sample.created_at).getTime();
  const createdAtFrom = new Date(createdAt - 1000).toISOString();
  const createdAtTo = new Date(createdAt + 1000).toISOString();
  const createdRange = await api.functional.erpHrmTime.member.sessions.index(
    memberConnection,
    {
      body: {
        createdAtFrom,
        createdAtTo,
        page: 1,
        limit: 100,
      } satisfies IErpHrmTimeMemberSession.IRequest,
    },
  );
  typia.assert(createdRange);
  TestValidator.predicate(
    "createdAt range includes lower bound",
    createdRange.data.every(
      (row) =>
        new Date(row.created_at).getTime() >= new Date(createdAtFrom).getTime(),
    ),
  );
  TestValidator.predicate(
    "createdAt range includes upper bound",
    createdRange.data.every(
      (row) =>
        new Date(row.created_at).getTime() <= new Date(createdAtTo).getTime(),
    ),
  );
  const expiredAt = new Date(sample.expired_at).getTime();
  const expiredAtFrom = new Date(expiredAt - 1000).toISOString();
  const expiredAtTo = new Date(expiredAt + 1000).toISOString();
  const expiredRange = await api.functional.erpHrmTime.member.sessions.index(
    memberConnection,
    {
      body: {
        expiredAtFrom,
        expiredAtTo,
        page: 1,
        limit: 100,
      } satisfies IErpHrmTimeMemberSession.IRequest,
    },
  );
  typia.assert(expiredRange);
  TestValidator.predicate(
    "expiredAt range includes lower bound",
    expiredRange.data.every(
      (row) =>
        new Date(row.expired_at).getTime() >= new Date(expiredAtFrom).getTime(),
    ),
  );
  TestValidator.predicate(
    "expiredAt range includes expired sessions in range",
    expiredRange.data.some(
      (row) => new Date(row.expired_at).getTime() <= Date.now(),
    ),
  );
  const combined = await api.functional.erpHrmTime.member.sessions.index(
    memberConnection,
    {
      body: {
        search: sample.ip,
        createdAtFrom,
        createdAtTo,
        expiredAtFrom,
        expiredAtTo,
        sort: "createdAt",
        order: "desc",
        page: 1,
        limit: 100,
      } satisfies IErpHrmTimeMemberSession.IRequest,
    },
  );
  typia.assert(combined);
  TestValidator.predicate(
    "combined filters return narrowed subset",
    combined.data.every(
      (row) =>
        row.ip.toLowerCase().includes(sample.ip.toLowerCase()) &&
        new Date(row.created_at).getTime() >=
          new Date(createdAtFrom).getTime() &&
        new Date(row.created_at).getTime() <= new Date(createdAtTo).getTime() &&
        new Date(row.expired_at).getTime() >=
          new Date(expiredAtFrom).getTime() &&
        new Date(row.expired_at).getTime() <= new Date(expiredAtTo).getTime(),
    ),
  );
  TestValidator.equals(
    "combined pagination current page",
    combined.pagination.current,
    1,
  );
  TestValidator.predicate(
    "combined pagination metadata remains valid",
    combined.pagination.records >= combined.data.length &&
      combined.pagination.pages >= 0,
  );
}
