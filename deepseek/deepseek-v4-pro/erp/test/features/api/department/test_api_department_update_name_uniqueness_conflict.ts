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

export async function test_api_department_update_name_uniqueness_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member with org:manage permission
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create first department with a distinct name
  const department1 = await generate_random_erp_hrm_member_departments_create(
    memberConnection,
    { body: { name: RandomGenerator.name() } },
  );
  typia.assert(department1);
  // 3. Create second department with a different name
  const department2 = await generate_random_erp_hrm_member_departments_create(
    memberConnection,
    { body: { name: RandomGenerator.name() } },
  );
  typia.assert(department2);
  // 4. Attempt to rename department2 to department1's name — expect 409 Conflict
  await TestValidator.httpError("name uniqueness conflict", 409, async () => {
    await api.functional.erpHrm.member.departments.update(memberConnection, {
      departmentId: department2.id,
      body: { name: department1.name } satisfies IErpHrmDepartment.IUpdate,
    });
  });
  // 5. Verify department2's name remains unchanged after the failed update
  TestValidator.equals(
    "department2 name unchanged after conflict",
    department2.name,
    department1.name,
  );
}
