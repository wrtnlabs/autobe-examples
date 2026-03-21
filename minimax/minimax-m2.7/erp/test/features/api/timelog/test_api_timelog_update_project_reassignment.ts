import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
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
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

/**
 * Test reassigning a timelog to a different project.
 *
 * 1. Authenticate as member using /erpHrm/auth/member/join
 * 2. Create first project using /erpHrm/member/projects (original timelog project)
 * 3. Create second project using /erpHrm/member/projects (reassignment target)
 * 4. Create timelog using /erpHrm/member/timelogs associated with first project
 * 5. Update the timelog using PUT /erpHrm/member/timelogs/{timelogId} with second project's project_id
 * 6. Verify the response shows timelog now associated with second project
 * 7. Verify original project_id no longer appears in response
 * 8. Verify updated_at timestamp reflects the change
 */
export async function test_api_timelog_update_project_reassignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create first project (original timelog project)
  const firstProject = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#3A7BD5" satisfies string & tags.Pattern<"^#[0-9A-Fa-f]{6}$">,
        status: "active" as const,
      },
    },
  );
  typia.assert(firstProject);
  // 3. Create second project (reassignment target)
  const secondProject = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#E74C3C" satisfies string & tags.Pattern<"^#[0-9A-Fa-f]{6}$">,
        status: "active" as const,
      },
    },
  );
  typia.assert(secondProject);
  // 4. Create timelog with first project
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: firstProject.id,
        date: new Date().toISOString(),
        durationMinutes: 60 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1>,
        description: "Original timelog description",
        billable: true,
      },
    },
  );
  typia.assert(timelog);
  // Store original project ID and updated_at for comparison
  const originalProjectId = timelog.project.id;
  const originalUpdatedAt = timelog.updated_at;
  // 5. Update the timelog to reassign to second project
  const updatedTimelog = await api.functional.erpHrm.member.timelogs.update(
    memberConnection,
    {
      timelogId: timelog.id,
      body: {
        project_id: secondProject.id,
      } satisfies IErpHrmTimelog.IUpdate,
    },
  );
  typia.assert(updatedTimelog);
  // 6. Verify the timelog is now associated with second project
  TestValidator.equals(
    "updated project id matches second project",
    updatedTimelog.project.id,
    secondProject.id,
  );
  // 7. Verify original project_id no longer appears
  TestValidator.equals(
    "original project id no longer present",
    updatedTimelog.project.id,
    originalProjectId,
  );
  TestValidator.notEquals(
    "project changed",
    updatedTimelog.project.id,
    firstProject.id,
  );
  // 8. Verify updated_at timestamp was updated
  TestValidator.predicate(
    "updated_at changed after reassignment",
    updatedTimelog.updated_at !== originalUpdatedAt,
  );
}
