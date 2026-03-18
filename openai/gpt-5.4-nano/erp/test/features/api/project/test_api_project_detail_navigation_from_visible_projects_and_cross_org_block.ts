import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import type { IErpHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProjectMembership";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_projects_create";
import { prepare_random_erp_hrm_time_tracking_project } from "../../../prepare/prepare_random_erp_hrm_time_tracking_project";

export async function test_api_project_detail_navigation_from_visible_projects_and_cross_org_block(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: same-org list-to-detail navigation
  const orgAConnection: api.IConnection = { host: connection.host };
  const authorizedA = await authorize_member_join(orgAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      organizationName: `orgA-${RandomGenerator.alphabets(8)}`,
      organizationDescription: `descA-${RandomGenerator.alphabets(8)}`,
      organizationCurrencyCode: RandomGenerator.pick([
        "USD",
        "EUR",
        "KRW",
        "JPY",
      ]) satisfies string,
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
      href: `https://example.com/join/${RandomGenerator.alphabets(12)}`,
      referrer: `https://example.com/ref/${RandomGenerator.alphabets(12)}`,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorizedA);
  const createdProjectsA = await ArrayUtil.asyncRepeat(3, async () =>
    generate_random_erp_hrm_time_tracking_member_projects_create(
      orgAConnection,
      {},
    ),
  );
  for (const project of createdProjectsA) {
    typia.assert(project);
  }
  const assignedA =
    await api.functional.erpHrmTimeTracking.member.projects.assigned.index(
      orgAConnection,
      {
        body: typia.random<IErpHrmTimeTrackingProjectMembership.IRequest>(),
      },
    );
  typia.assert(assignedA);
  TestValidator.predicate(
    "should have assigned projects in org A",
    assignedA.data.length > 0,
  );
  const selectedSummaryA = RandomGenerator.pick(assignedA.data);
  const detailA = await api.functional.erpHrmTimeTracking.member.projects.at(
    orgAConnection,
    { projectId: selectedSummaryA.id },
  );
  typia.assert(detailA);
  TestValidator.equals("project id matches", detailA.id, selectedSummaryA.id);
  TestValidator.equals(
    "project name matches",
    detailA.name,
    selectedSummaryA.name,
  );
  TestValidator.equals(
    "project color matches",
    detailA.color,
    selectedSummaryA.color,
  );
  TestValidator.equals(
    "project status matches",
    detailA.status,
    selectedSummaryA.status,
  );
  TestValidator.equals(
    "project org id matches",
    detailA.erp_hrm_time_tracking_organization_id,
    selectedSummaryA.erp_hrm_time_tracking_organization_id,
  );
  // Scenario 2: cross-org access denial
  const orgBConnection: api.IConnection = { host: connection.host };
  const authorizedB = await authorize_member_join(orgBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      organizationName: `orgB-${RandomGenerator.alphabets(8)}`,
      organizationDescription: `descB-${RandomGenerator.alphabets(8)}`,
      organizationCurrencyCode: RandomGenerator.pick([
        "USD",
        "EUR",
        "KRW",
        "JPY",
      ]) satisfies string,
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
      href: `https://example.com/join/${RandomGenerator.alphabets(12)}`,
      referrer: `https://example.com/ref/${RandomGenerator.alphabets(12)}`,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorizedB);
  await TestValidator.error(
    "should deny access to org A project from org B context",
    async () => {
      await api.functional.erpHrmTimeTracking.member.projects.at(
        orgBConnection,
        { projectId: selectedSummaryA.id },
      );
    },
  );
}
