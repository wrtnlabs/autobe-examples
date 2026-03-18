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

export async function test_api_project_duplicate_name_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Create organization to establish the context
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Create first project with specific name
  const projectName = "Test Project Alpha";
  const firstProject = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: projectName,
      },
    },
  );
  typia.assert(firstProject);
  TestValidator.equals(
    "first project name matches input",
    firstProject.name,
    projectName,
  );
  // Attempt to create second project with same name - should fail with 409
  await TestValidator.httpError(
    "duplicate project name returns 409 Conflict",
    409,
    async () => {
      await generate_random_erp_hrm_member_projects_create(memberConnection, {
        body: {
          name: projectName,
        },
      });
    },
  );
  // Attempt with different case (case-insensitive uniqueness check)
  await TestValidator.httpError(
    "case-insensitive duplicate name returns 409 Conflict",
    409,
    async () => {
      await generate_random_erp_hrm_member_projects_create(memberConnection, {
        body: {
          name: projectName.toUpperCase(),
        },
      });
    },
  );
}
