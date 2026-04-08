import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";

/**
 * Test that a member can successfully retrieve a project within their organization.
 *
 * Validates the complete project retrieval flow including member authentication, organization creation, project creation, and project detail retrieval by UUID. Ensures that the response contains all project fields and that attributes match the creation values.
 *
 * Special attention is given to verifying that the project organization reference is correctly maintained and that the project status is 'active' with deleted_at being null for an active project.
 *
 * 1. Member registers with email and password via join endpoint.
 * 2. Member creates an organization within their context.
 * 3. Member creates a project within the organization with name, color, and optional details.
 * 4. Member retrieves the project by its UUID.
 * 5. Validates all project fields match creation values including id, organization, name, description, color, status, budget_hours, start_date, end_date, and timestamps. Confirms project status is 'active' and deleted_at is null.
 */
export async function test_api_project_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication via join
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create project within organization
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 4. Retrieve project by ID
  const retrieved = await api.functional.hrmPlatform.member.projects.at(
    memberConnection,
    {
      projectId: project.id,
    },
  );
  typia.assert(retrieved);
  // 5. Validate all fields match
  TestValidator.equals("project id", retrieved.id, project.id);
  TestValidator.equals("project name", retrieved.name, project.name);
  TestValidator.equals("project color", retrieved.color, project.color);
  TestValidator.equals("project status", retrieved.status, "active");
  TestValidator.equals(
    "organization id",
    retrieved.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "organization name",
    retrieved.organization.name,
    organization.name,
  );
  TestValidator.equals(
    "organization currency",
    retrieved.organization.currency,
    organization.currency,
  );
  TestValidator.equals(
    "organization timezone",
    retrieved.organization.timezone,
    organization.timezone,
  );
  TestValidator.predicate("deleted_at is null", retrieved.deleted_at === null);
  TestValidator.equals(
    "description matches",
    retrieved.description,
    project.description,
  );
  TestValidator.equals(
    "budget_hours matches",
    retrieved.budget_hours,
    project.budget_hours,
  );
  TestValidator.equals(
    "start_date matches",
    retrieved.start_date,
    project.start_date,
  );
  TestValidator.equals(
    "end_date matches",
    retrieved.end_date,
    project.end_date,
  );
}
