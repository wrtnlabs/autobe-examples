import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import type { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organizations_projects_create } from "../../../generate/generate_random_hrms_member_organizations_projects_create";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";

export async function test_api_project_status_update_to_completed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate new member
  const authConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_member_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
      href: "https://test.example.com/signup",
      referrer: "https://test.example.com",
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(authResponse);
  // Extract organization ID from member's organization memberships
  typia.assert(Array.isArray(authResponse.organization_memberships));
  typia.assert(authResponse.organization_memberships.length > 0);
  const organizationId: string & tags.Format<"uuid"> =
    authResponse.organization_memberships[0].organization.id;
  // 2. Use authConnection directly (updated internally by authorize_member_join)
  // 3. Create project in 'active' status
  const projectCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 5 }),
    description: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 10,
    }),
    color_code: typia.random<string & tags.Pattern<"^#[0-9A-Fa-f]{6}$">>(),
    budget_hours: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<10> & tags.Maximum<10000>
    >(),
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
  } satisfies IHrmsProject.ICreate;
  const createdProjectRaw = await api.functional.hrms.member.organizations.projects.create(
    authConnection,
    {
      organizationId,
      body: projectCreateBody,
    },
  );
  const createdProject = typia.assert<
    typeof createdProjectRaw extends { id: string } & { status: string }
      ? typeof createdProjectRaw
      : IHrmsProject & {
          id: string & tags.Format<"uuid">;
          status: "active" | "completed";
          name: string;
          description: string;
          color_code: string;
          budget_hours: number;
          actual_hours: number;
          timelog_count: number;
        }
  >(createdProjectRaw);
  // Validate initial project status is 'active'
  TestValidator.equals(
    "project initial status",
    createdProject.status,
    "active",
  );
  // 4. Update project status from 'active' to 'completed'
  const updatedProjectRaw = await api.functional.hrms.member.projects.update(
    authConnection,
    {
      projectId: createdProject.id,
      body: {
        name: createdProject.name,
        color_code: createdProject.color_code,
        status: "completed",
      } satisfies IHrmsProject.IUpdate,
    },
  );
  const updatedProject = typia.assert<
    typeof updatedProjectRaw extends { id: string } & { status: string }
      ? typeof updatedProjectRaw
      : IHrmsProject & {
          id: string & tags.Format<"uuid">;
          status: "active" | "completed";
          name: string;
          description: string;
          color_code: string;
          budget_hours: number;
          actual_hours: number;
          timelog_count: number;
        }
  >(updatedProjectRaw);
  // 5. Validate status change and project metadata
  TestValidator.equals(
    "project status updated to completed",
    updatedProject.status,
    "completed",
  );
  TestValidator.equals(
    "project name preserved",
    updatedProject.name,
    createdProject.name,
  );
  TestValidator.equals(
    "project description preserved",
    updatedProject.description,
    createdProject.description,
  );
  TestValidator.equals(
    "project color code preserved",
    updatedProject.color_code,
    createdProject.color_code,
  );
  TestValidator.equals(
    "project budget hours preserved",
    updatedProject.budget_hours,
    createdProject.budget_hours,
  );
  TestValidator.equals(
    "project actual hours still zero",
    updatedProject.actual_hours,
    0,
  );
  TestValidator.equals(
    "project timelog count still zero",
    updatedProject.timelog_count,
    0,
  );
}