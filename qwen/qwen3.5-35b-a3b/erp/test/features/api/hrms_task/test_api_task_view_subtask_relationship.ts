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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organizations_projects_create } from "../../../generate/generate_random_hrms_member_organizations_projects_create";
import { generate_random_hrms_member_projects_tasks_create } from "../../../generate/generate_random_hrms_member_projects_tasks_create";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";
import { prepare_random_hrms_task } from "../../../prepare/prepare_random_hrms_task";

export async function test_api_task_view_subtask_relationship(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member and get auth credentials
  const joinConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "https://example.com/signup",
      referrer: "https://example.com",
    },
  });
  typia.assert(memberAuth);
  // 2. Create actor-specific connection for authenticated member
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    ...memberConnection.headers,
    Authorization: memberAuth.token.access,
  };
  // 3. Get organization ID from member's organization memberships
  const firstOrg = memberAuth.organization_memberships[0];
  TestValidator.predicate(
    "member has at least one organization",
    firstOrg !== undefined,
  );
  const organizationId: string = firstOrg.organization.id;
  // 4. Create project within organization
  const project =
    await api.functional.hrms.member.organizations.projects.create(
      memberConnection,
      {
        organizationId: organizationId,
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          color_code: "#" + RandomGenerator.alphaNumeric(6),
        },
      },
    );
  typia.assert(project);
  const projectId: string = (
    project as unknown as {
      id: string;
    }
  ).id;
  // 5. Create parent task within project
  const parentTask = await api.functional.hrms.member.projects.tasks.create(
    memberConnection,
    {
      projectId: projectId,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "open" as const,
        priority: "medium" as const,
        estimated_hours: typia.random<number & tags.Minimum<0>>(),
        due_date: RandomGenerator.date(
          new Date(),
          1000 * 60 * 60 * 24 * 30,
        ).toISOString(),
      },
    },
  );
  typia.assert(parentTask);
  const parentTaskId: string = (
    parentTask as unknown as {
      id: string;
    }
  ).id;
  // 6. Create subtask with parent task reference
  const subTask = await api.functional.hrms.member.projects.tasks.create(
    memberConnection,
    {
      projectId: projectId,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        status: "open" as const,
        priority: "low" as const,
        estimated_hours: typia.random<number & tags.Minimum<0>>(),
        due_date: RandomGenerator.date(
          new Date(),
          1000 * 60 * 60 * 24 * 14,
        ).toISOString(),
        hrms_task_id: parentTaskId,
      },
    },
  );
  typia.assert(subTask);
  const subTaskId: string = (
    subTask as unknown as {
      id: string;
    }
  ).id;
  // 7. View subtask to verify parent reference
  const viewSubTask = await api.functional.hrms.member.projects.tasks.at(
    memberConnection,
    {
      projectId: projectId,
      taskId: subTaskId,
    },
  );
  typia.assert(viewSubTask);
  // 8. Validate subtask has correct parent task reference
  TestValidator.equals(
    "subtask has correct parent task ID",
    (
      viewSubTask as unknown as {
        hrms_task_id: string;
      }
    ).hrms_task_id,
    parentTaskId,
  );
  // 9. Validate subtask belongs to same project context
  TestValidator.equals(
    "subtask id matches created subtask",
    (
      viewSubTask as unknown as {
        id: string;
      }
    ).id,
    subTaskId,
  );
  // 10. Validate subtask has title
  TestValidator.predicate(
    "subtask has title",
    (
      viewSubTask as unknown as {
        title: string;
      }
    ).title.length > 0,
  );
  // 11. Validate subtask has parent reference
  TestValidator.predicate(
    "subtask has parent reference",
    (
      viewSubTask as unknown as {
        hrms_task_id: string | null;
      }
    ).hrms_task_id !== undefined &&
      (
        viewSubTask as unknown as {
          hrms_task_id: string | null;
        }
      ).hrms_task_id !== null,
  );
  // 12. Verify subtask status is correct
  TestValidator.equals(
    "subtask status is correct",
    (
      viewSubTask as unknown as {
        status: "open" | "in-progress" | "completed" | "closed";
      }
    ).status,
    "open",
  );
  // 13. Verify subtask priority is correct
  TestValidator.equals(
    "subtask priority is correct",
    (
      viewSubTask as unknown as {
        priority: "low" | "medium" | "high" | "urgent";
      }
    ).priority,
    "low",
  );
}
