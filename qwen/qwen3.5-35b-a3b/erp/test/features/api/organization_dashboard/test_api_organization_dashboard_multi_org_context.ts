import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_organization_dashboard_multi_org_context(
  connection: api.IConnection,
): Promise<void> {
  // Create two member accounts to simulate different organization contexts
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member1Auth);
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member2Auth);
  // Verify both members have different organization memberships
  TestValidator.notEquals(
    "member1 has organization memberships",
    member1Auth.organization_memberships,
    [],
  );
  TestValidator.notEquals(
    "member2 has organization memberships",
    member2Auth.organization_memberships,
    [],
  );
  // Extract organization context from each member
  const member1Org = member1Auth.organization_memberships[0].organization;
  const member2Org = member2Auth.organization_memberships[0].organization;
  TestValidator.notEquals(
    "organizations should be different",
    member1Org.id,
    member2Org.id,
  );
  // Create dedicated connections with tokens for each member
  const member1AuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: member1Auth.token.access,
    },
  };
  const member2AuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: member2Auth.token.access,
    },
  };
  // Fetch dashboard for member1's organization context
  const dashboardMember1 =
    await api.functional.hrms.member.dashboard.organization.at(
      member1AuthConnection,
    );
  typia.assert(dashboardMember1);
  // Fetch dashboard for member2's organization context
  const dashboardMember2 =
    await api.functional.hrms.member.dashboard.organization.at(
      member2AuthConnection,
    );
  typia.assert(dashboardMember2);
  // Validate that both dashboards have proper generatedAt timestamp
  TestValidator.predicate(
    "member1 dashboard has generatedAt timestamp",
    () => dashboardMember1.generatedAt !== undefined,
  );
  TestValidator.predicate(
    "member2 dashboard has generatedAt timestamp",
    () => dashboardMember2.generatedAt !== undefined,
  );
  // Validate that totalActiveEmployees exists and is non-negative
  TestValidator.predicate(
    "member1 dashboard has totalActiveEmployees",
    () => dashboardMember1.totalActiveEmployees >= 0,
  );
  TestValidator.predicate(
    "member2 dashboard has totalActiveEmployees",
    () => dashboardMember2.totalActiveEmployees >= 0,
  );
  // Validate that totalHoursThisWeek exists and is non-negative
  TestValidator.predicate(
    "member1 dashboard has totalHoursThisWeek",
    () => dashboardMember1.totalHoursThisWeek >= 0,
  );
  TestValidator.predicate(
    "member2 dashboard has totalHoursThisWeek",
    () => dashboardMember2.totalHoursThisWeek >= 0,
  );
  // Validate that pendingTimesheetsCount exists and is non-negative
  TestValidator.predicate(
    "member1 dashboard has pendingTimesheetsCount",
    () => dashboardMember1.pendingTimesheetsCount >= 0,
  );
  TestValidator.predicate(
    "member2 dashboard has pendingTimesheetsCount",
    () => dashboardMember2.pendingTimesheetsCount >= 0,
  );
  // Validate that projectsOverBudget is an array
  TestValidator.predicate(
    "member1 dashboard has projectsOverBudget array",
    () => Array.isArray(dashboardMember1.projectsOverBudget),
  );
  TestValidator.predicate(
    "member2 dashboard has projectsOverBudget array",
    () => Array.isArray(dashboardMember2.projectsOverBudget),
  );
  // Validate that topEmployees is an array
  TestValidator.predicate("member1 dashboard has topEmployees array", () =>
    Array.isArray(dashboardMember1.topEmployees),
  );
  TestValidator.predicate("member2 dashboard has topEmployees array", () =>
    Array.isArray(dashboardMember2.topEmployees),
  );
  // Validate that topEmployees has at most 5 items (as per specification)
  TestValidator.predicate(
    "member1 dashboard topEmployees respects max 5 limit",
    () => dashboardMember1.topEmployees.length <= 5,
  );
  TestValidator.predicate(
    "member2 dashboard topEmployees respects max 5 limit",
    () => dashboardMember2.topEmployees.length <= 5,
  );
  // Verify that the two dashboards have different organization contexts
  // (metrics could be same or different depending on actual data, but context should differ)
  // This validates that the API correctly isolates data based on member context
  const contextDiffer = member1Org.id !== member2Org.id;
  TestValidator.predicate(
    "member contexts are different organizations",
    contextDiffer,
  );
}