import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMembership";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_hrm_time_tracking_projects_create } from "../../../generate/generate_random_hrm_time_tracking_projects_create";
import { generate_random_hrm_time_tracking_projects_memberships_create } from "../../../generate/generate_random_hrm_time_tracking_projects_memberships_create";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_project_membership } from "../../../prepare/prepare_random_hrm_time_tracking_project_membership";

export async function test_api_project_membership_detail_existing_assignment(
  connection: api.IConnection,
): Promise<void> {
  const actorConnection: api.IConnection = { host: connection.host };
  const project: IHrmTimeTrackingProject =
    await generate_random_hrm_time_tracking_projects_create(actorConnection, {
      body: {
        name: `project-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        color_code: "#33aa77",
        status: "active",
      },
    });
  typia.assert(project);
  const createdMembership: IHrmTimeTrackingProjectMembership =
    await generate_random_hrm_time_tracking_projects_memberships_create(
      actorConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          membership_role: "project-lead",
        },
      },
    );
  typia.assert(createdMembership);
  const found: IHrmTimeTrackingProjectMembership =
    await api.functional.hrmTimeTracking.projects.memberships.at(
      actorConnection,
      {
        projectId: project.id,
        membershipId: createdMembership.id,
      },
    );
  typia.assert(found);
  TestValidator.equals(
    "membership id matches created assignment",
    found.id,
    createdMembership.id,
  );
  TestValidator.equals(
    "membership role persists",
    found.membership_role,
    "project-lead",
  );
  TestValidator.equals(
    "project summary id matches parent project",
    found.project.id,
    project.id,
  );
  TestValidator.equals(
    "project summary organization id matches",
    found.project.organization.id,
    project.organization.id,
  );
  TestValidator.equals(
    "project summary name matches",
    found.project.name,
    project.name,
  );
  TestValidator.equals(
    "project summary description matches",
    found.project.description,
    project.description,
  );
  TestValidator.equals(
    "project summary status matches",
    found.project.status,
    project.status,
  );
  TestValidator.equals(
    "employee id matches assigned employee",
    found.employee.id,
    createdMembership.employee.id,
  );
  TestValidator.equals(
    "employee email matches assigned employee",
    found.employee.email,
    createdMembership.employee.email,
  );
  TestValidator.equals(
    "employee email verification timestamp unchanged",
    found.employee.email_verified_at,
    createdMembership.employee.email_verified_at,
  );
  TestValidator.equals(
    "employee last login timestamp unchanged",
    found.employee.last_logged_in_at,
    createdMembership.employee.last_logged_in_at,
  );
  TestValidator.equals(
    "employee created timestamp unchanged",
    found.employee.created_at,
    createdMembership.employee.created_at,
  );
  TestValidator.equals(
    "employee updated timestamp unchanged",
    found.employee.updated_at,
    createdMembership.employee.updated_at,
  );
  TestValidator.equals(
    "employee deleted timestamp unchanged",
    found.employee.deleted_at,
    createdMembership.employee.deleted_at,
  );
  TestValidator.equals(
    "membership created timestamp unchanged after read",
    found.created_at,
    createdMembership.created_at,
  );
  TestValidator.equals(
    "membership updated timestamp unchanged after read",
    found.updated_at,
    createdMembership.updated_at,
  );
  TestValidator.equals(
    "membership deleted timestamp unchanged after read",
    found.deleted_at,
    createdMembership.deleted_at,
  );
}
