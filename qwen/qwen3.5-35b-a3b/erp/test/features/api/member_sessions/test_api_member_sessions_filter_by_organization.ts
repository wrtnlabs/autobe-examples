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

export async function test_api_member_sessions_filter_by_organization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: RandomGenerator.alphaNumeric(30),
      referrer: RandomGenerator.alphaNumeric(30),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Verify member belongs to at least one organization
  TestValidator.predicate(
    "member has at least one organization membership",
    memberAuth.organization_memberships.length > 0,
  );
  // 3. Extract organization IDs from memberships
  const orgIds = memberAuth.organization_memberships.map(
    (om: IHrmsOrganizationMember.ISummary) => om.organization.id,
  );
  TestValidator.predicate("orgIds array has entries", orgIds.length > 0);
  // 4. Create a new connection with the member's authorization token
  const sessionsConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberAuth.token.access },
  };
  // 5. Retrieve sessions filtered by the first organization
  const firstOrgId = orgIds[0];
  const sessionsWithFilter: IPageIHrmsMemberSession.ISummary =
    await api.functional.hrms.member.sessions.index(sessionsConnection, {
      body: {
        currentOrganizationId: firstOrgId,
      } satisfies IHrmsMemberSession.IRequest,
    });
  typia.assert(sessionsWithFilter);
  // 6. Verify pagination is correct
  TestValidator.equals(
    "pagination current page is 1",
    sessionsWithFilter.pagination.current,
    1,
  );
  // 7. Verify all returned sessions belong to the filtered organization
  for (const session of sessionsWithFilter.data) {
    TestValidator.equals(
      "session organization matches filter",
      session.current_organization_id,
      firstOrgId,
    );
    // Verify organization details match
    if (session.currentOrganization !== null) {
      TestValidator.equals(
        "session organization id matches",
        session.currentOrganization.id,
        firstOrgId,
      );
    }
  }
  // 8. Test filtering with a different organization ID (if member has multiple)
  if (orgIds.length > 1) {
    const secondOrgId = orgIds[1];
    const sessionsWithSecondFilter: IPageIHrmsMemberSession.ISummary =
      await api.functional.hrms.member.sessions.index(sessionsConnection, {
        body: {
          currentOrganizationId: secondOrgId,
        } satisfies IHrmsMemberSession.IRequest,
      });
    typia.assert(sessionsWithSecondFilter);
    // Verify all returned sessions belong to the second organization
    for (const session of sessionsWithSecondFilter.data) {
      TestValidator.equals(
        "session organization matches second filter",
        session.current_organization_id,
        secondOrgId,
      );
    }
  }
  // 9. Test filtering with invalid/non-existent organization ID
  const invalidOrgId = typia.random<string>();
  const sessionsWithInvalidFilter: IPageIHrmsMemberSession.ISummary =
    await api.functional.hrms.member.sessions.index(sessionsConnection, {
      body: {
        currentOrganizationId: invalidOrgId as string & tags.Format<"uuid">,
      } satisfies IHrmsMemberSession.IRequest,
    });
  typia.assert(sessionsWithInvalidFilter);
  // 10. Verify empty results for invalid organization
  TestValidator.equals(
    "empty results for invalid organization id",
    sessionsWithInvalidFilter.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records is 0 for empty results",
    sessionsWithInvalidFilter.pagination.records,
    0,
  );
  // 11. Test pagination with limit parameter
  const limit = 5;
  const sessionsWithLimit: IPageIHrmsMemberSession.ISummary =
    await api.functional.hrms.member.sessions.index(sessionsConnection, {
      body: {
        currentOrganizationId: firstOrgId,
        limit,
      } satisfies IHrmsMemberSession.IRequest,
    });
  typia.assert(sessionsWithLimit);
  // 12. Verify limit is applied correctly
  TestValidator.predicate(
    "limit is applied to returned data",
    sessionsWithLimit.data.length <= limit,
  );
}
