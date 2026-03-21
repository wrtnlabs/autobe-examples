import { RandomGenerator, TestValidator } from "@nestia/e2e";
import typia from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";

/**
 * Test admin creates a new project with only the required fields (name, color, status).
 *
 * Scenario:
 * 1. Authenticate as admin via join endpoint
 * 2. Create a project with only required fields: name, color, status
 * 3. Validate the project is created successfully with status 'active'
 * 4. Verify all default values are set (empty compositions, generated UUID, timestamps)
 * 5. Validate project is associated with the admin's organization context
 */
export async function test_api_project_creation_with_required_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);

  // 2. Create a project with only required fields
  const projectBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    color: "#" + RandomGenerator.alphabets(6).toUpperCase(),
    status: "active" as const,
  } satisfies IErpHrmProjectMember.ICreate;

  const project = await api.functional.erpHrm.admin.projects.create(
    adminConnection,
    {
      body: projectBody,
    },
  );
  typia.assert(project);

  // 3. Validate project is created successfully with status 'active'
  TestValidator.equals("status is active", project.status, "active");

  // 4. Validate required fields match input
  TestValidator.equals("name matches input", project.name, projectBody.name);
  TestValidator.equals("color matches input", project.color, projectBody.color);

  // 5. Validate UUID is generated
  TestValidator.predicate(
    "id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(project.id),
  );

  // 6. Validate timestamps are valid ISO datetime strings
  TestValidator.predicate("created_at is valid date", !isNaN(Date.parse(project.created_at)));
  TestValidator.predicate("updated_at is valid date", !isNaN(Date.parse(project.updated_at)));

  // 7. Validate empty compositions (default values)
  TestValidator.equals("tasks is empty array", project.tasks, []);
  TestValidator.equals("timelogs is empty array", project.timelogs, []);
  TestValidator.equals("timers is empty array", project.timers, []);
  TestValidator.equals("projectMemberships is empty array", project.projectMemberships, []);

  // 8. Validate counts are zero
  TestValidator.equals("tasks_count is 0", project.tasks_count, 0);
  TestValidator.equals("project_members_count is 0", project.project_members_count, 0);

  // 9. Validate organization context is set
  TestValidator.predicate("organization exists", !!project.organization);
  TestValidator.predicate("organization has id", project.organization?.id?.length > 0);
}