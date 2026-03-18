import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";

export async function test_api_project_reactivate_from_archived(
  connection: api.IConnection,
): Promise<void> {
  // Create isolated member connection for test operations
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      avatarUrl: null,
      timezone: null,
      locale: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  // Step 1: Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  // Step 2: Create active project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        status: "active",
      },
    },
  );
  typia.assert(project);
  TestValidator.predicate(
    "project is initially active",
    project.status === "active",
  );
  // Step 3: Archive the project to establish precondition
  const archived = await api.functional.erpHrm.member.projects.archive(
    memberConnection,
    {
      projectId: project.id,
      body: {
        status: "archived",
      } satisfies IErpHrmProject.IUpdate,
    },
  );
  typia.assert(archived);
  TestValidator.predicate(
    "project is archived",
    archived.status === "archived",
  );
  // Step 4: Reactivate the archived project
  const reactivated = await api.functional.erpHrm.member.projects.reactivate(
    memberConnection,
    {
      projectId: project.id,
    },
  );
  typia.assert(reactivated);
  // Step 5: Validate reactivation results
  TestValidator.equals("project ID preserved", reactivated.id, project.id);
  TestValidator.equals(
    "project name preserved",
    reactivated.name,
    project.name,
  );
  TestValidator.predicate(
    "project status is active",
    reactivated.status === "active",
  );
  TestValidator.predicate(
    "updated_at was refreshed",
    new Date(reactivated.updated_at) >= new Date(project.updated_at),
  );
}
