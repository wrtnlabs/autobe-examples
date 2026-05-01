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
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";

export async function test_api_department_delete_already_deleted_returns_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Create a department to be deleted
  const department = await generate_random_erp_hrm_member_departments_create(
    memberConnection,
    {},
  );
  typia.assert(department);
  // First deletion - should succeed (soft-delete)
  await api.functional.erpHrm.member.departments.erase(memberConnection, {
    departmentId: department.id,
  });
  // Second deletion - should return 404 since department is already soft-deleted
  await TestValidator.httpError(
    "delete already soft-deleted department returns 404",
    404,
    async () => {
      await api.functional.erpHrm.member.departments.erase(memberConnection, {
        departmentId: department.id,
      });
    },
  );
}
