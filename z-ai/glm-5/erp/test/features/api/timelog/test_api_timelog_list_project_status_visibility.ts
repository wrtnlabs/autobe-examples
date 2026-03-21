import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

/**
 * Test timelog visibility across project status changes.
 * Validates that timelogs remain accessible when projects are archived or completed.
 */
export async function test_api_timelog_list_project_status_visibility(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2. Create first project (will be archived later)
  const firstProject = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: `Archive Test Project ${RandomGenerator.alphaNumeric(8)}`,
        color_code: "#FF5733",
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(firstProject);
  TestValidator.equals(
    "first project status active",
    firstProject.status,
    "active",
  );
  // 3. Create multiple timelogs for first project (before archiving)
  const firstProjectTimelogs = await ArrayUtil.asyncRepeat(3, async (index) => {
    const timelog = await generate_random_erp_hrm_member_timelogs_create(
      memberConnection,
      {
        body: {
          project_id: firstProject.id,
          date: new Date(
            Date.now() - index * 24 * 60 * 60 * 1000,
          ).toISOString(),
          duration: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<30> & tags.Maximum<480>
          >(),
          description: `Timelog ${index + 1} for archived project`,
          billable: index % 2 === 0,
        } satisfies IErpHrmTimelog.ICreate,
      },
    );
    typia.assert(timelog);
    return timelog;
  });
  // 4. Update first project status to 'archived'
  const archivedProject = await api.functional.erpHrm.member.projects.update(
    memberConnection,
    {
      projectId: firstProject.id,
      body: { status: "archived" } satisfies IErpHrmProject.IUpdate,
    },
  );
  typia.assert(archivedProject);
  TestValidator.equals(
    "project status archived",
    archivedProject.status,
    "archived",
  );
  // 5. Request timelog list filtered by archived project ID
  const archivedProjectTimelogs =
    await api.functional.erpHrm.member.timelogs.index(memberConnection, {
      body: { projectId: firstProject.id } satisfies IErpHrmTimelog.IRequest,
    });
  typia.assert(archivedProjectTimelogs);
  // 6. Validate all timelogs are still visible
  TestValidator.equals(
    "archived project timelogs count",
    archivedProjectTimelogs.data.length,
    firstProjectTimelogs.length,
  );
  // Validate each timelog's project shows archived status
  for (const timelog of archivedProjectTimelogs.data) {
    TestValidator.equals(
      "project status in timelog",
      timelog.project.status,
      "archived",
    );
    TestValidator.equals(
      "project id matches",
      timelog.project.id,
      firstProject.id,
    );
  }
  // Validate timelog IDs match
  const archivedTimelogIds = new Set(
    archivedProjectTimelogs.data.map((t) => t.id),
  );
  for (const originalTimelog of firstProjectTimelogs) {
    TestValidator.predicate(
      `timelog ${originalTimelog.id} visible in archived project`,
      archivedTimelogIds.has(originalTimelog.id),
    );
  }
  // 7. Create second project (will be completed later)
  const secondProject = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: `Completed Test Project ${RandomGenerator.alphaNumeric(8)}`,
        color_code: "#3357FF",
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(secondProject);
  // 8. Create multiple timelogs for second project (before completion)
  const secondProjectTimelogs = await ArrayUtil.asyncRepeat(
    3,
    async (index) => {
      const timelog = await generate_random_erp_hrm_member_timelogs_create(
        memberConnection,
        {
          body: {
            project_id: secondProject.id,
            date: new Date(
              Date.now() - index * 24 * 60 * 60 * 1000,
            ).toISOString(),
            duration: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<30> & tags.Maximum<480>
            >(),
            description: `Timelog ${index + 1} for completed project`,
            billable: index % 2 === 1,
          } satisfies IErpHrmTimelog.ICreate,
        },
      );
      typia.assert(timelog);
      return timelog;
    },
  );
  // 9. Update second project status to 'completed'
  const completedProject = await api.functional.erpHrm.member.projects.update(
    memberConnection,
    {
      projectId: secondProject.id,
      body: { status: "completed" } satisfies IErpHrmProject.IUpdate,
    },
  );
  typia.assert(completedProject);
  TestValidator.equals(
    "project status completed",
    completedProject.status,
    "completed",
  );
  // 10. Request timelog list filtered by completed project ID
  const completedProjectTimelogs =
    await api.functional.erpHrm.member.timelogs.index(memberConnection, {
      body: { projectId: secondProject.id } satisfies IErpHrmTimelog.IRequest,
    });
  typia.assert(completedProjectTimelogs);
  // 11. Validate all timelogs are still visible
  TestValidator.equals(
    "completed project timelogs count",
    completedProjectTimelogs.data.length,
    secondProjectTimelogs.length,
  );
  // Validate each timelog's project shows completed status
  for (const timelog of completedProjectTimelogs.data) {
    TestValidator.equals(
      "project status in timelog",
      timelog.project.status,
      "completed",
    );
    TestValidator.equals(
      "project id matches",
      timelog.project.id,
      secondProject.id,
    );
  }
  // Validate timelog IDs match
  const completedTimelogIds = new Set(
    completedProjectTimelogs.data.map((t) => t.id),
  );
  for (const originalTimelog of secondProjectTimelogs) {
    TestValidator.predicate(
      `timelog ${originalTimelog.id} visible in completed project`,
      completedTimelogIds.has(originalTimelog.id),
    );
  }
  // 12. Test date range filtering on archived project timelogs
  const oldestDate = firstProjectTimelogs.reduce((min, t) =>
    new Date(t.date) < new Date(min.date) ? t : min,
  ).date;
  const newestDate = firstProjectTimelogs.reduce((max, t) =>
    new Date(t.date) > new Date(max.date) ? t : max,
  ).date;
  const dateFilteredTimelogs =
    await api.functional.erpHrm.member.timelogs.index(memberConnection, {
      body: {
        projectId: firstProject.id,
        from: oldestDate,
        to: newestDate,
      } satisfies IErpHrmTimelog.IRequest,
    });
  typia.assert(dateFilteredTimelogs);
  TestValidator.predicate(
    "date filtered archived project timelogs found",
    dateFilteredTimelogs.data.length > 0,
  );
  // 13. Test billable filtering on completed project timelogs
  const billableFilteredTimelogs =
    await api.functional.erpHrm.member.timelogs.index(memberConnection, {
      body: {
        projectId: secondProject.id,
        billable: true,
      } satisfies IErpHrmTimelog.IRequest,
    });
  typia.assert(billableFilteredTimelogs);
  // Validate all returned timelogs are billable
  for (const timelog of billableFilteredTimelogs.data) {
    TestValidator.equals("billable filter works", timelog.billable, true);
  }
  // 14. Validate timelog data completeness regardless of project status
  const allTimelogs = [
    ...archivedProjectTimelogs.data,
    ...completedProjectTimelogs.data,
  ];
  for (const timelog of allTimelogs) {
    TestValidator.predicate("timelog has duration", timelog.duration > 0);
    TestValidator.predicate(
      "timelog has valid project",
      timelog.project.id !== null,
    );
    TestValidator.predicate(
      "project status is archived or completed",
      timelog.project.status === "archived" ||
        timelog.project.status === "completed",
    );
  }
}
