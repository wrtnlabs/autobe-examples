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
import { generate_random_erp_hrm_member_departments_create } from "../../../generate/generate_random_erp_hrm_member_departments_create";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_department_deletion_not_found_already_deleted(
  connection: api.IConnection,
) {
  // 1. Create authorized member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create department within the organization
  const department = await generate_random_erp_hrm_member_departments_create(
    memberConnection,
    {},
  );
  typia.assert(department);
  // 4. Delete the department first time (successful)
  await api.functional.erpHrm.member.departments.erase(memberConnection, {
    departmentId: department.id,
  });
  // 5. Attempt to delete the already deleted department - should throw 404 error
  await TestValidator.httpError(
    "delete already deleted department should return 404",
    404,
    async () => {
      await api.functional.erpHrm.member.departments.erase(memberConnection, {
        departmentId: department.id,
      });
    },
  );
  // 6. Attempt to delete non-existent department - should throw 404 error
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "delete non-existent department should return 404",
    404,
    async () => {
      await api.functional.erpHrm.member.departments.erase(memberConnection, {
        departmentId: nonExistentId,
      });
    },
  );
}
