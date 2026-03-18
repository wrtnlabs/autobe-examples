import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import type { IHrmTimeTrackingOwnerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwnerSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingOwnerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingOwnerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_session_filter_active_and_sort_within_scope(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: `Password1234!${RandomGenerator.alphabets(4)}`,
    href: `https://example.com/${RandomGenerator.alphabets(8)}`,
    referrer: `https://referrer.example.com/${RandomGenerator.alphabets(8)}`,
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmTimeTrackingOwner.IJoin;
  const authorized = await authorize_owner_join(ownerConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  const initialPage = await api.functional.hrmTimeTracking.owner.sessions.index(
    ownerConnection,
    {
      body: {
        actorType: "owner",
        page: 1,
        limit: 10,
      } satisfies IHrmTimeTrackingOwnerSession.IRequest,
    },
  );
  typia.assert(initialPage);
  TestValidator.equals(
    "initial page current page is 1",
    initialPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "initial page limit is 10",
    initialPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "initial page contains at least one owner session",
    initialPage.data.length > 0,
  );
  TestValidator.predicate(
    "initial page data length does not exceed limit",
    initialPage.data.length <= 10,
  );
  const scopedOrganizationId = initialPage.data[0]?.organization.id;
  const referenceTime = Date.now();
  const createdAtFrom = new Date(
    referenceTime - 1000 * 60 * 60 * 24,
  ).toISOString();
  const createdAtTo = new Date(
    referenceTime + 1000 * 60 * 60 * 24,
  ).toISOString();
  const activeRequest = {
    actorType: "owner",
    active: true,
    organizationId: scopedOrganizationId,
    createdAtFrom,
    createdAtTo,
    sort: "-expiredAt",
    page: 1,
    limit: 10,
  } satisfies IHrmTimeTrackingOwnerSession.IRequest;
  const activePage = await api.functional.hrmTimeTracking.owner.sessions.index(
    ownerConnection,
    {
      body: activeRequest,
    },
  );
  typia.assert(activePage);
  TestValidator.equals(
    "active page current matches request",
    activePage.pagination.current,
    activeRequest.page,
  );
  TestValidator.equals(
    "active page limit matches request",
    activePage.pagination.limit,
    activeRequest.limit,
  );
  TestValidator.predicate(
    "active page records cover returned rows",
    activePage.pagination.records >= activePage.data.length,
  );
  TestValidator.predicate(
    "active page pages is non negative",
    activePage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "active page data length does not exceed limit",
    activePage.data.length <= (activeRequest.limit ?? 10),
  );
  for (const session of activePage.data) {
    TestValidator.equals(
      "session belongs to joined owner email",
      session.owner.email,
      authorized.email,
    );
    TestValidator.predicate(
      "session created_at is within requested range",
      new Date(session.created_at).getTime() >=
        new Date(createdAtFrom).getTime() &&
        new Date(session.created_at).getTime() <=
          new Date(createdAtTo).getTime(),
    );
    TestValidator.predicate(
      "session is active by expiration",
      new Date(session.expired_at).getTime() > referenceTime,
    );
    if (scopedOrganizationId !== undefined) {
      TestValidator.equals(
        "session remains within scoped organization",
        session.organization.id,
        scopedOrganizationId,
      );
    }
  }
  for (let i = 1; i < activePage.data.length; ++i) {
    TestValidator.predicate(
      "sessions are sorted by expired_at descending",
      new Date(activePage.data[i - 1].expired_at).getTime() >=
        new Date(activePage.data[i].expired_at).getTime(),
    );
  }
  const expiredRequest = {
    actorType: "owner",
    active: false,
    expired: true,
    organizationId: scopedOrganizationId,
    sort: "-expiredAt",
    page: 1,
    limit: 10,
  } satisfies IHrmTimeTrackingOwnerSession.IRequest;
  const expiredPage = await api.functional.hrmTimeTracking.owner.sessions.index(
    ownerConnection,
    {
      body: expiredRequest,
    },
  );
  typia.assert(expiredPage);
  TestValidator.equals(
    "expired page current matches request",
    expiredPage.pagination.current,
    expiredRequest.page,
  );
  TestValidator.equals(
    "expired page limit matches request",
    expiredPage.pagination.limit,
    expiredRequest.limit,
  );
  TestValidator.predicate(
    "expired page records cover returned rows",
    expiredPage.pagination.records >= expiredPage.data.length,
  );
  TestValidator.predicate(
    "expired page data length does not exceed limit",
    expiredPage.data.length <= (expiredRequest.limit ?? 10),
  );
  for (const session of expiredPage.data) {
    TestValidator.equals(
      "expired session belongs to joined owner email",
      session.owner.email,
      authorized.email,
    );
    TestValidator.predicate(
      "expired filter returns only expired sessions",
      new Date(session.expired_at).getTime() <= referenceTime,
    );
    if (scopedOrganizationId !== undefined) {
      TestValidator.equals(
        "expired session remains within scoped organization",
        session.organization.id,
        scopedOrganizationId,
      );
    }
  }
}
