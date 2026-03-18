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

export async function test_api_project_update_duplicate_name_validation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create organization to establish organizational context
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Create first project with a unique name
  const firstProject = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: "First Unique Project",
      },
    },
  );
  typia.assert(firstProject);
  // Step 4: Create second project with a different unique name
  const secondProject = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Second Unique Project",
      },
    },
  );
  typia.assert(secondProject);
  // Step 5: Verify both projects have different names
  TestValidator.notEquals(
    "project names should be different",
    firstProject.name,
    secondProject.name,
  );
  // Step 6: Attempt to update second project with first project's name - should fail
  await TestValidator.error(
    "should reject update with duplicate project name within organization",
    async () => {
      await api.functional.erpHrm.member.projects.update(memberConnection, {
        projectId: secondProject.id,
        body: {
          name: firstProject.name,
        } satisfies IErpHrmProject.IUpdate,
      });
    },
  );
}
