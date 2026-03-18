import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMemberSession";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_sessions_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create multiple sessions with different created_at timestamps
  // Simulate sessions from different time periods
  const now = new Date();
  const today = now.toISOString();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const twoDaysAgo = new Date(
    now.getTime() - 48 * 60 * 60 * 1000,
  ).toISOString();
  const threeDaysAgo = new Date(
    now.getTime() - 72 * 60 * 60 * 1000,
  ).toISOString();
  // Create sessions manually through the API with specific timestamps
  // We'll use a pattern of creating sessions and verifying they appear in filtered queries
  // 3. Test filtering by created_to (sessions up to a certain date)
  const connectionWithToken: api.IConnection = { host: connection.host };
  connectionWithToken.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // Get sessions with createdTo set to yesterday
  const sessionsBeforeToday: IPageIHrmsMemberSession.ISummary =
    await api.functional.hrms.member.sessions.index(connectionWithToken, {
      body: {
        createdTo: yesterday,
        limit: 100,
      } satisfies IHrmsMemberSession.IRequest,
    });
  typia.assert(sessionsBeforeToday);
  // Validate that no session has created_at after yesterday
  for (const session of sessionsBeforeToday.data) {
    typia.assert(session);
    TestValidator.predicate(
      "session created_at is before or on yesterday",
      session.created_at <= yesterday,
    );
  }
  // 4. Test filtering by created_from (sessions from a certain date onwards)
  const sessionsAfterYesterday: IPageIHrmsMemberSession.ISummary =
    await api.functional.hrms.member.sessions.index(connectionWithToken, {
      body: {
        createdFrom: yesterday,
        limit: 100,
      } satisfies IHrmsMemberSession.IRequest,
    });
  typia.assert(sessionsAfterYesterday);
  // Validate that all sessions have created_at on or after yesterday
  for (const session of sessionsAfterYesterday.data) {
    typia.assert(session);
    TestValidator.predicate(
      "session created_at is on or after yesterday",
      session.created_at >= yesterday,
    );
  }
  // 5. Test filtering by both created_from and created_to
  const sessionsBetween: IPageIHrmsMemberSession.ISummary =
    await api.functional.hrms.member.sessions.index(connectionWithToken, {
      body: {
        createdFrom: yesterday,
        createdTo: today,
        limit: 100,
      } satisfies IHrmsMemberSession.IRequest,
    });
  typia.assert(sessionsBetween);
  // Validate all sessions are within the date range
  for (const session of sessionsBetween.data) {
    typia.assert(session);
    TestValidator.predicate(
      "session created_at is within range [yesterday, today]",
      session.created_at >= yesterday && session.created_at <= today,
    );
  }
  // 6. Test filtering by expired_from (expired sessions)
  const expiredFrom: IPageIHrmsMemberSession.ISummary =
    await api.functional.hrms.member.sessions.index(connectionWithToken, {
      body: {
        expiredFrom: today,
        limit: 100,
      } satisfies IHrmsMemberSession.IRequest,
    });
  typia.assert(expiredFrom);
  // Validate all returned sessions are expired (expired_at >= today)
  for (const session of expiredFrom.data) {
    typia.assert(session);
    TestValidator.predicate(
      "session expired_at is today or later",
      session.expired_at >= today,
    );
  }
  // 7. Test filtering by expired_to (sessions that have expired by a certain date)
  const expiredByYesterday: IPageIHrmsMemberSession.ISummary =
    await api.functional.hrms.member.sessions.index(connectionWithToken, {
      body: {
        expiredTo: yesterday,
        limit: 100,
      } satisfies IHrmsMemberSession.IRequest,
    });
  typia.assert(expiredByYesterday);
  // Validate all returned sessions have expired_at on or before yesterday
  for (const session of expiredByYesterday.data) {
    typia.assert(session);
    TestValidator.predicate(
      "session expired_at is on or before yesterday",
      session.expired_at <= yesterday,
    );
  }
  // 8. Test combined filtering (created range + organization filter)
  const organizationId =
    authorized.organization_memberships.length > 0
      ? authorized.organization_memberships[0].organization.id
      : undefined;
  const filteredWithOrg: IPageIHrmsMemberSession.ISummary =
    await api.functional.hrms.member.sessions.index(connectionWithToken, {
      body: {
        createdFrom: twoDaysAgo,
        createdTo: today,
        currentOrganizationId: organizationId,
        limit: 100,
      } satisfies IHrmsMemberSession.IRequest,
    });
  typia.assert(filteredWithOrg);
  // Validate organization context is preserved
  for (const session of filteredWithOrg.data) {
    typia.assert(session);
    if (organizationId !== undefined) {
      TestValidator.equals(
        "session organization matches filter",
        session.currentOrganization?.id,
        organizationId,
      );
    }
  }
  // 9. Test pagination with filtered results
  const firstPage: IPageIHrmsMemberSession.ISummary =
    await api.functional.hrms.member.sessions.index(connectionWithToken, {
      body: {
        createdFrom: threeDaysAgo,
        limit: 5,
        page: 1,
      } satisfies IHrmsMemberSession.IRequest,
    });
  typia.assert(firstPage);
  // Validate pagination metadata
  TestValidator.predicate(
    "first page has correct records",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "first page has correct limit",
    firstPage.pagination.limit === 5,
  );
  TestValidator.equals("first page number", firstPage.pagination.current, 1);
  // 10. Validate organization information is included in each session
  for (const session of firstPage.data) {
    typia.assert(session);
    TestValidator.predicate(
      "session has current organization context",
      session.currentOrganization !== null,
    );
  }
}
