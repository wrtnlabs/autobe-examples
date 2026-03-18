import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

/**
 * Test retrieval of a non-existent department.
 *
 * 1. Authenticate as a member
 * 2. Create an organization for isolation context
 * 3. Select the organization as active context
 * 4. Attempt to retrieve a department with a random UUID that doesn't exist
 * 5. Verify that the API returns HTTP 404 Not Found
 */
export async function test_api_department_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Create organization for isolation context
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Select the organization as active context
  await api.functional.erpHrm.member.organizations.at(memberConnection, {
    organizationId: organization.id,
  });
  // Generate non-existent department ID
  const nonExistentDepartmentId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve non-existent department and expect 404
  await TestValidator.httpError(
    "should return 404 for non-existent department",
    404,
    async () => {
      await api.functional.erpHrm.member.departments.at(memberConnection, {
        departmentId: nonExistentDepartmentId,
      });
    },
  );
}
