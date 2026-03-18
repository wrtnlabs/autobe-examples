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

export async function test_api_department_deletion_with_child_departments(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member with org:manage permission
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      firstName: RandomGenerator.name(),
      lastName: RandomGenerator.name(),
      avatarUrl: null,
      timezone: "Asia/Seoul",
      locale: "en-US",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IErpHrmMember.IJoin,
  });
  typia.assert(authorizedMember);
  // 2. Create a parent department (top-level)
  const parentDepartment =
    await generate_random_erp_hrm_member_departments_create(memberConnection, {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        parentDepartmentId: null,
      } satisfies IErpHrmDepartment.ICreate,
    });
  typia.assert(parentDepartment);
  TestValidator.equals(
    "parent department has no parent",
    parentDepartment.parentDepartment,
    null,
  );
  // 3. Create a child department with parentDepartmentId referencing the parent
  const childDepartment =
    await generate_random_erp_hrm_member_departments_create(memberConnection, {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        parentDepartmentId: parentDepartment.id,
      } satisfies IErpHrmDepartment.ICreate,
    });
  typia.assert(childDepartment);
  // 4. Verify child department has correct parent reference initially
  TestValidator.equals(
    "child department references parent",
    childDepartment.parentDepartment?.id,
    parentDepartment.id,
  );
  // 5. Execute DELETE on the parent department
  await api.functional.erpHrm.member.departments.erase(memberConnection, {
    departmentId: parentDepartment.id,
  });
  // 6. Verify system remains consistent by creating another department
  // Note: Without a GET endpoint for departments, we cannot directly verify
  // the child's parentDepartmentId was cleared to null, but we verify
  // the system is still functional after the cascade delete
  const anotherDepartment =
    await generate_random_erp_hrm_member_departments_create(memberConnection, {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        parentDepartmentId: null,
      } satisfies IErpHrmDepartment.ICreate,
    });
  typia.assert(anotherDepartment);
}
