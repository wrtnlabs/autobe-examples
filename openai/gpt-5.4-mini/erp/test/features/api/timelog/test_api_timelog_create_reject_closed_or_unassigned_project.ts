import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
import type { IErpHrmTimeTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_projects_create } from "../../../generate/generate_random_erp_hrm_time_member_projects_create";
import { generate_random_erp_hrm_time_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_time_member_timelogs_create";
import { prepare_random_erp_hrm_time_project } from "../../../prepare/prepare_random_erp_hrm_time_project";
import { prepare_random_erp_hrm_time_timelog } from "../../../prepare/prepare_random_erp_hrm_time_timelog";

export async function test_api_timelog_create_reject_closed_or_unassigned_project(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com`,
      password: "P@ssw0rd123!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const activeProject =
    await generate_random_erp_hrm_time_member_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          colorCode: "#3366FF",
          status: "active",
        } satisfies IErpHrmTimeProject.ICreate,
      },
    );
  typia.assert(activeProject);
  await TestValidator.httpError(
    "timelog creation should reject an unassigned active project",
    [400, 403, 409, 422],
    async () => {
      await api.functional.erpHrmTime.member.timelogs.create(memberConnection, {
        body: {
          workDate: new Date().toISOString(),
          durationMinutes: 30,
          projectId: activeProject.id,
          description: RandomGenerator.paragraph({ sentences: 1 }),
          billable: true,
        } satisfies IErpHrmTimeTimelog.ICreate,
      });
    },
  );
  await TestValidator.httpError(
    "timelog creation should reject a closed project lifecycle state",
    [400, 403, 409, 422],
    async () => {
      const closedProject =
        await api.functional.erpHrmTime.member.projects.create(
          memberConnection,
          {
            body: {
              name: `${RandomGenerator.name()} closed`,
              description: RandomGenerator.paragraph({ sentences: 2 }),
              colorCode: "#AA3344",
              status: RandomGenerator.pick(["archived", "completed"] as const),
            } satisfies IErpHrmTimeProject.ICreate,
          },
        );
      typia.assert(closedProject);
      await api.functional.erpHrmTime.member.timelogs.create(memberConnection, {
        body: {
          workDate: new Date().toISOString(),
          durationMinutes: 45,
          projectId: closedProject.id,
          description: RandomGenerator.paragraph({ sentences: 1 }),
          billable: true,
        } satisfies IErpHrmTimeTimelog.ICreate,
      });
    },
  );
}
