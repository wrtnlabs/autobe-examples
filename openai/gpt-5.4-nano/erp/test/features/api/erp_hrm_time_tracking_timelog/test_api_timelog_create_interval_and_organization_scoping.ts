import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import type { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import type { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
import type { IErpHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimelog";
import type { IErpHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_projects_create";
import { generate_random_erp_hrm_time_tracking_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_timelogs_create";
import { prepare_random_erp_hrm_time_tracking_project } from "../../../prepare/prepare_random_erp_hrm_time_tracking_project";
import { prepare_random_erp_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_erp_hrm_time_tracking_timelog";

export async function test_api_timelog_create_interval_and_organization_scoping(
  connection: api.IConnection,
): Promise<void> {
  const nowIso = new Date("2026-03-18T11:45:03.557Z").toISOString();
  // Member A setup
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAPassword = "P@ssw0rd!";
  await authorize_member_join(memberAConnection, {
    body: {
      email: memberAEmail,
      password: memberAPassword,
      organizationName: `org-${RandomGenerator.alphabets(8)}`,
      organizationDescription: RandomGenerator.paragraph({ sentences: 1 }),
      organizationCurrencyCode: "KRW",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join",
      referrer: "https://example.com/ref",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  const projectA: IErpHrmTimeTrackingProject =
    await api.functional.erpHrmTimeTracking.member.projects.create(
      memberAConnection,
      {
        body: {
          name: `project-${RandomGenerator.alphabets(10)}`,
          color: "#2196f3",
          status: "active",
        } satisfies IErpHrmTimeTrackingProject.ICreate,
      },
    );
  typia.assert(projectA);
  // Create timelog in member A's org
  const startA = new Date(nowIso).toISOString();
  const endA = new Date(
    new Date(nowIso).getTime() + 30 * 60 * 1000,
  ).toISOString();
  const durationMinutes = 30;
  const timelogA: IErpHrmTimeTrackingTimelog =
    await api.functional.erpHrmTimeTracking.member.timelogs.create(
      memberAConnection,
      {
        body: {
          work_date: nowIso,
          start_time: startA,
          end_time: endA,
          duration_minutes: durationMinutes,
          erpHrmTimeTrackingProjectId: projectA.id,
          note: null,
        } satisfies IErpHrmTimeTrackingTimelog.ICreate,
      },
    );
  typia.assert(timelogA);
  TestValidator.notEquals(
    "timelog start_time should not be null",
    timelogA.start_time,
    null,
  );
  TestValidator.notEquals(
    "timelog end_time should not be null",
    timelogA.end_time,
    null,
  );
  TestValidator.equals(
    "duration_minutes matches",
    timelogA.duration_minutes,
    durationMinutes,
  );
  TestValidator.equals(
    "project scope matches",
    timelogA.project.id,
    projectA.id,
  );
  // Member B setup
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  await authorize_member_join(memberBConnection, {
    body: {
      email: memberBEmail,
      password: memberAPassword,
      organizationName: `org-${RandomGenerator.alphabets(8)}`,
      organizationDescription: RandomGenerator.paragraph({ sentences: 1 }),
      organizationCurrencyCode: "KRW",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 2,
      href: "https://example.com/join",
      referrer: "https://example.com/ref",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  const projectB: IErpHrmTimeTrackingProject =
    await api.functional.erpHrmTimeTracking.member.projects.create(
      memberBConnection,
      {
        body: {
          name: `project-${RandomGenerator.alphabets(10)}`,
          color: "#4caf50",
          status: "active",
        } satisfies IErpHrmTimeTrackingProject.ICreate,
      },
    );
  typia.assert(projectB);
  // Cross-organization timelog creation should be rejected
  await TestValidator.httpError(
    "cross-organization timelog creation must be rejected",
    [400, 401, 403, 404, 409, 422],
    async () => {
      await api.functional.erpHrmTimeTracking.member.timelogs.create(
        memberAConnection,
        {
          body: {
            work_date: nowIso,
            start_time: startA,
            end_time: endA,
            duration_minutes: durationMinutes,
            erpHrmTimeTrackingProjectId: projectB.id,
            note: null,
          } satisfies IErpHrmTimeTrackingTimelog.ICreate,
        },
      );
    },
  );
}
