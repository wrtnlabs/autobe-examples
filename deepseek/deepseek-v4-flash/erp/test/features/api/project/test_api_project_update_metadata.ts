import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMember";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { generate_random_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";

export async function test_api_project_update_metadata(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test updating an active project's basic metadata fields.
   *
   * Validates the complete project update workflow including member authentication, organization creation, project creation, and metadata update. Ensures that updated fields (name, description, color_code) are correctly persisted and unchanged fields (status, id, organization) remain intact.
   *
   * 1. Join as a member to obtain authentication tokens.
   * 2. Create an organization — the member becomes Owner with project:manage permission.
   * 3. Create an active project with specific metadata (name='Original Project', color_code='#3498DB').
   * 4. Update the project's metadata fields (name='Updated Project', description='This project was renamed', color_code='#2ECC71').
   * 5. Validate updated fields reflect the new values.
   * 6. Validate unchanged fields (status='active', id, organization) remain as before.
   * 7. Validate updated_at is newer than created_at.
   */
  // 1. Join as a member to obtain authentication tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create an organization — the member becomes Owner with project:manage permission
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create an active project with specific metadata
  const originalProject =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {
        body: {
          name: "Original Project",
          color_code: "#3498DB",
        },
      },
    );
  typia.assert(originalProject);
  // 4. Update the project's metadata fields
  const updatedProject =
    await api.functional.hrmTimeTracking.member.projects.update(
      memberConnection,
      {
        projectId: originalProject.id,
        body: {
          name: "Updated Project",
          description: "This project was renamed",
          color_code: "#2ECC71",
        } satisfies IHrmTimeTrackingProject.IUpdate,
      },
    );
  typia.assert(updatedProject);
  // 5. Validate updated fields
  TestValidator.equals("name", updatedProject.name, "Updated Project");
  TestValidator.equals(
    "description",
    updatedProject.description,
    "This project was renamed",
  );
  TestValidator.equals("color_code", updatedProject.color_code, "#2ECC71");
  // 6. Validate unchanged fields
  TestValidator.equals(
    "status remains active",
    updatedProject.status,
    "active",
  );
  // 7. Validate id and organization remain unchanged
  TestValidator.equals("id unchanged", updatedProject.id, originalProject.id);
  TestValidator.equals(
    "organization unchanged",
    updatedProject.organization.id,
    originalProject.organization.id,
  );
  // 8. Validate updated_at reflects a newer timestamp than created_at
  TestValidator.predicate(
    "updated_at is newer than created_at",
    new Date(updatedProject.updated_at).getTime() >
      new Date(updatedProject.created_at).getTime(),
  );
}
