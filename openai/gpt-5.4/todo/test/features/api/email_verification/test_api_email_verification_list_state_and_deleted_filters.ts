import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberEmailVerification";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_email_verification_list_state_and_deleted_filters(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password1234!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoAppMember.IJoin;
  const joined = await authorize_member_join(memberConnection, {
    body: joinBody,
  });
  typia.assert(joined);
  TestValidator.equals(
    "joined email matches request",
    joined.email,
    joinBody.email,
  );
  const assertPagination = (
    title: string,
    page: IPageITodoAppMemberEmailVerification.ISummary,
    expectedCurrent: number,
    expectedLimit?: number,
  ): void => {
    TestValidator.equals(
      `${title} current page`,
      page.pagination.current,
      expectedCurrent,
    );
    TestValidator.predicate(
      `${title} limit is positive`,
      page.pagination.limit > 0,
    );
    if (expectedLimit !== undefined) {
      TestValidator.equals(
        `${title} limit matches request`,
        page.pagination.limit,
        expectedLimit,
      );
    }
    TestValidator.predicate(
      `${title} record count covers data length`,
      page.pagination.records >= page.data.length,
    );
    TestValidator.predicate(
      `${title} data length within limit`,
      page.data.length <= page.pagination.limit,
    );
    TestValidator.equals(
      `${title} pages formula`,
      page.pagination.pages,
      page.pagination.records === 0
        ? 0
        : Math.ceil(page.pagination.records / page.pagination.limit),
    );
  };
  const defaultPage =
    await api.functional.todoApp.member.emailVerifications.index(
      memberConnection,
      {
        body: {} satisfies ITodoAppMemberEmailVerification.IRequest,
      },
    );
  typia.assert(defaultPage);
  assertPagination("default pagination", defaultPage, 1);
  for (const record of defaultPage.data) {
    TestValidator.equals(
      "default excludes deleted rows",
      record.deleted_at,
      null,
    );
  }
  const now = Date.now();
  const activePage =
    await api.functional.todoApp.member.emailVerifications.index(
      memberConnection,
      {
        body: {
          state: "active",
          page: 1,
          limit: 100,
          sort: "expired_at_asc",
        } satisfies ITodoAppMemberEmailVerification.IRequest,
      },
    );
  typia.assert(activePage);
  assertPagination("active pagination", activePage, 1, 100);
  for (let i = 1; i < activePage.data.length; ++i) {
    TestValidator.predicate(
      "active sort expired_at ascending",
      new Date(activePage.data[i - 1].expired_at).getTime() <=
        new Date(activePage.data[i].expired_at).getTime(),
    );
  }
  for (const record of activePage.data) {
    TestValidator.equals("active used_at absent", record.used_at, null);
    TestValidator.equals("active revoked_at absent", record.revoked_at, null);
    TestValidator.equals(
      "active deleted_at absent by default",
      record.deleted_at,
      null,
    );
    TestValidator.predicate(
      "active expiration is in the future",
      new Date(record.expired_at).getTime() > now,
    );
  }
  const usedPage = await api.functional.todoApp.member.emailVerifications.index(
    memberConnection,
    {
      body: {
        state: "used",
        page: 1,
        limit: 100,
      } satisfies ITodoAppMemberEmailVerification.IRequest,
    },
  );
  typia.assert(usedPage);
  assertPagination("used pagination", usedPage, 1, 100);
  for (const record of usedPage.data) {
    TestValidator.predicate(
      "used records have used_at",
      record.used_at !== null,
    );
  }
  const revokedPage =
    await api.functional.todoApp.member.emailVerifications.index(
      memberConnection,
      {
        body: {
          state: "revoked",
          page: 1,
          limit: 100,
        } satisfies ITodoAppMemberEmailVerification.IRequest,
      },
    );
  typia.assert(revokedPage);
  assertPagination("revoked pagination", revokedPage, 1, 100);
  for (const record of revokedPage.data) {
    TestValidator.predicate(
      "revoked records have revoked_at",
      record.revoked_at !== null,
    );
  }
  const expiredPage =
    await api.functional.todoApp.member.emailVerifications.index(
      memberConnection,
      {
        body: {
          state: "expired",
          page: 1,
          limit: 100,
          sort: "expired_at_desc",
        } satisfies ITodoAppMemberEmailVerification.IRequest,
      },
    );
  typia.assert(expiredPage);
  assertPagination("expired pagination", expiredPage, 1, 100);
  for (let i = 1; i < expiredPage.data.length; ++i) {
    TestValidator.predicate(
      "expired sort expired_at descending",
      new Date(expiredPage.data[i - 1].expired_at).getTime() >=
        new Date(expiredPage.data[i].expired_at).getTime(),
    );
  }
  for (const record of expiredPage.data) {
    TestValidator.equals("expired used_at absent", record.used_at, null);
    TestValidator.equals("expired revoked_at absent", record.revoked_at, null);
    TestValidator.predicate(
      "expired records are in the past",
      new Date(record.expired_at).getTime() <= now,
    );
  }
  const includeDeletedPage =
    await api.functional.todoApp.member.emailVerifications.index(
      memberConnection,
      {
        body: {
          includeDeleted: true,
          page: 1,
          limit: 100,
          sort: "created_at_desc",
        } satisfies ITodoAppMemberEmailVerification.IRequest,
      },
    );
  typia.assert(includeDeletedPage);
  assertPagination("includeDeleted pagination", includeDeletedPage, 1, 100);
  for (let i = 1; i < includeDeletedPage.data.length; ++i) {
    TestValidator.predicate(
      "includeDeleted sort created_at descending",
      new Date(includeDeletedPage.data[i - 1].created_at).getTime() >=
        new Date(includeDeletedPage.data[i].created_at).getTime(),
    );
  }
  const hasDeleted = ArrayUtil.has(
    includeDeletedPage.data,
    (record) => record.deleted_at !== null,
  );
  TestValidator.equals(
    "default page never returns deleted rows",
    ArrayUtil.has(defaultPage.data, (record) => record.deleted_at !== null),
    false,
  );
  if (hasDeleted === true) {
    TestValidator.equals(
      "includeDeleted can expose deleted rows while default cannot",
      ArrayUtil.has(
        includeDeletedPage.data,
        (record) => record.deleted_at !== null,
      ),
      true,
    );
  }
}
