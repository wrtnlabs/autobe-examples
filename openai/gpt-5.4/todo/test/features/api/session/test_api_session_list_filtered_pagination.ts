import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberSession";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_session_list_filtered_pagination(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) satisfies string as string &
      tags.Format<"password">,
    href: `https://example.com/todo/${RandomGenerator.alphabets(8)}` satisfies string as string &
      tags.Format<"uri">,
    referrer:
      `https://referrer.example.com/${RandomGenerator.alphabets(8)}` satisfies string as string &
        tags.Format<"uri">,
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoAppMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  const firstPageRequest = {
    page: 1 satisfies number as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 1 satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    sort: "-created_at",
  } satisfies ITodoAppMemberSession.IRequest;
  const firstPage = await api.functional.todoApp.member.sessions.index(
    memberConnection,
    {
      body: firstPageRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.equals(
    "first page current matches request",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit matches request",
    firstPage.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "first page data length within requested limit",
    firstPage.data.length <= 1,
  );
  TestValidator.predicate(
    "first page records covers returned items",
    firstPage.pagination.records >= firstPage.data.length,
  );
  TestValidator.predicate(
    "first page pages is non negative",
    firstPage.pagination.pages >= 0,
  );
  for (const session of firstPage.data) {
    TestValidator.predicate("session id is non-empty", session.id.length > 0);
    TestValidator.predicate(
      "session href is non-empty",
      session.href.length > 0,
    );
    TestValidator.predicate(
      "session referrer is non-empty",
      session.referrer.length > 0,
    );
    TestValidator.predicate("session ip is non-empty", session.ip.length > 0);
  }
  const hrefPage = await api.functional.todoApp.member.sessions.index(
    memberConnection,
    {
      body: {
        href: joinBody.href,
        page: 1 satisfies number as number &
          tags.Type<"int32"> &
          tags.Minimum<1>,
        limit: 1 satisfies number as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
        sort: "-created_at",
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(hrefPage);
  TestValidator.equals(
    "href page current matches request",
    hrefPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "href page limit matches request",
    hrefPage.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "href page size bounded by limit",
    hrefPage.data.length <= 1,
  );
  for (const session of hrefPage.data) {
    TestValidator.equals("href filter applied", session.href, joinBody.href);
  }
  const referrerPage = await api.functional.todoApp.member.sessions.index(
    memberConnection,
    {
      body: {
        referrer: joinBody.referrer,
        page: 1 satisfies number as number &
          tags.Type<"int32"> &
          tags.Minimum<1>,
        limit: 1 satisfies number as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
        sort: "-created_at",
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(referrerPage);
  TestValidator.equals(
    "referrer page current matches request",
    referrerPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "referrer page limit matches request",
    referrerPage.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "referrer page size bounded by limit",
    referrerPage.data.length <= 1,
  );
  for (const session of referrerPage.data) {
    TestValidator.equals(
      "referrer filter applied",
      session.referrer,
      joinBody.referrer,
    );
  }
  const ipPage = await api.functional.todoApp.member.sessions.index(
    memberConnection,
    {
      body: {
        ip: joinBody.ip,
        page: 1 satisfies number as number &
          tags.Type<"int32"> &
          tags.Minimum<1>,
        limit: 1 satisfies number as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
        sort: "-created_at",
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(ipPage);
  TestValidator.equals(
    "ip page current matches request",
    ipPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "ip page limit matches request",
    ipPage.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "ip page size bounded by limit",
    ipPage.data.length <= 1,
  );
  for (const session of ipPage.data) {
    TestValidator.equals("ip filter applied", session.ip, joinBody.ip);
  }
  if (firstPage.data.length > 0) {
    const target = firstPage.data[0];
    const createdAtPage = await api.functional.todoApp.member.sessions.index(
      memberConnection,
      {
        body: {
          created_at: target.created_at,
          page: 1 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1>,
          limit: 1 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          sort: "-created_at",
        } satisfies ITodoAppMemberSession.IRequest,
      },
    );
    typia.assert(createdAtPage);
    TestValidator.equals(
      "created_at page current matches request",
      createdAtPage.pagination.current,
      1,
    );
    TestValidator.equals(
      "created_at page limit matches request",
      createdAtPage.pagination.limit,
      1,
    );
    TestValidator.predicate(
      "created_at page size bounded by limit",
      createdAtPage.data.length <= 1,
    );
    for (const session of createdAtPage.data) {
      TestValidator.equals(
        "created_at filter applied",
        session.created_at,
        target.created_at,
      );
    }
    const expiredAtPage = await api.functional.todoApp.member.sessions.index(
      memberConnection,
      {
        body: {
          expired_at: target.expired_at,
          page: 1 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1>,
          limit: 1 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          sort: "-created_at",
        } satisfies ITodoAppMemberSession.IRequest,
      },
    );
    typia.assert(expiredAtPage);
    TestValidator.equals(
      "expired_at page current matches request",
      expiredAtPage.pagination.current,
      1,
    );
    TestValidator.equals(
      "expired_at page limit matches request",
      expiredAtPage.pagination.limit,
      1,
    );
    TestValidator.predicate(
      "expired_at page size bounded by limit",
      expiredAtPage.data.length <= 1,
    );
    for (const session of expiredAtPage.data) {
      TestValidator.equals(
        "expired_at filter applied",
        session.expired_at,
        target.expired_at,
      );
    }
  }
}
