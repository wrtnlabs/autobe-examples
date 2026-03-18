import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMembership";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_hrm_time_tracking_projects_create } from "../../../generate/generate_random_hrm_time_tracking_projects_create";
import { generate_random_hrm_time_tracking_projects_memberships_create } from "../../../generate/generate_random_hrm_time_tracking_projects_memberships_create";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_project_membership } from "../../../prepare/prepare_random_hrm_time_tracking_project_membership";

export async function test_api_project_membership_update_role_within_project(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const authorized: IHrmTimeTrackingOwner.IAuthorized =
    await authorize_owner_join(ownerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(authorized);
  const project: IHrmTimeTrackingProject =
    await generate_random_hrm_time_tracking_projects_create(ownerConnection, {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        color_code: `#${RandomGenerator.alphaNumeric(6)}`,
        status: "active",
        budget_hours: 160,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
      } satisfies IHrmTimeTrackingProject.ICreate,
    });
  typia.assert(project);
  const membership: IHrmTimeTrackingProjectMembership =
    await generate_random_hrm_time_tracking_projects_memberships_create(
      ownerConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          membership_role: "member",
        },
      },
    );
  typia.assert(membership);
  const updateBody = {
    membership_role: "project-lead",
  } satisfies IHrmTimeTrackingProjectMembership.IUpdate;
  const updated: IHrmTimeTrackingProjectMembership =
    await api.functional.hrmTimeTracking.projects.memberships.update(
      ownerConnection,
      {
        projectId: project.id,
        membershipId: membership.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals("membership id is preserved", updated.id, membership.id);
  TestValidator.equals(
    "membership role is updated",
    updated.membership_role,
    "project-lead",
  );
  TestValidator.equals(
    "created_at is preserved",
    updated.created_at,
    membership.created_at,
  );
  TestValidator.notEquals(
    "updated_at changes after update",
    updated.updated_at,
    membership.updated_at,
  );
  TestValidator.equals(
    "project relation keeps same id",
    updated.project.id,
    membership.project.id,
  );
  TestValidator.equals(
    "project relation remains target project",
    updated.project.id,
    project.id,
  );
  TestValidator.equals(
    "project relation keeps same name",
    updated.project.name,
    membership.project.name,
  );
  TestValidator.equals(
    "project organization is preserved",
    updated.project.organization.id,
    membership.project.organization.id,
  );
  TestValidator.equals(
    "employee relation keeps same id",
    updated.employee.id,
    membership.employee.id,
  );
  TestValidator.equals(
    "employee email is preserved",
    updated.employee.email,
    membership.employee.email,
  );
}
