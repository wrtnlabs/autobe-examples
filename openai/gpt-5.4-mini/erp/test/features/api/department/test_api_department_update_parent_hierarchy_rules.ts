import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_departments_create } from "../../../generate/generate_random_erp_hrm_time_member_departments_create";
import { prepare_random_erp_hrm_time_department } from "../../../prepare/prepare_random_erp_hrm_time_department";

export async function test_api_department_update_parent_hierarchy_rules(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd123!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  const rootDepartment =
    await generate_random_erp_hrm_time_member_departments_create(
      memberConnection,
      {
        body: {
          name: `root-${RandomGenerator.alphabets(6)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IErpHrmTimeDepartment.ICreate,
      },
    );
  typia.assert(rootDepartment);
  const childDepartment =
    await generate_random_erp_hrm_time_member_departments_create(
      memberConnection,
      {
        body: {
          name: `child-${RandomGenerator.alphabets(6)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IErpHrmTimeDepartment.ICreate,
      },
    );
  typia.assert(childDepartment);
  const updatedChild =
    await api.functional.erpHrmTime.member.departments.update(
      memberConnection,
      {
        departmentId: childDepartment.id,
        body: {
          name: childDepartment.name,
          description: childDepartment.description,
          parentDepartmentId: rootDepartment.id,
        } satisfies IErpHrmTimeDepartment.IUpdate,
      },
    );
  typia.assert(updatedChild);
  TestValidator.equals(
    "child department parent should be updated to root",
    updatedChild.parentDepartment?.id,
    rootDepartment.id,
  );
  TestValidator.equals(
    "child department name should remain the same",
    updatedChild.name,
    childDepartment.name,
  );
  TestValidator.equals(
    "child department description should remain the same",
    updatedChild.description,
    childDepartment.description,
  );
  await TestValidator.error(
    "department cannot be updated to reference itself as parent",
    async () => {
      await api.functional.erpHrmTime.member.departments.update(
        memberConnection,
        {
          departmentId: childDepartment.id,
          body: {
            name: childDepartment.name,
            description: childDepartment.description,
            parentDepartmentId: childDepartment.id,
          } satisfies IErpHrmTimeDepartment.IUpdate,
        },
      );
    },
  );
  const renamedChild =
    await api.functional.erpHrmTime.member.departments.update(
      memberConnection,
      {
        departmentId: childDepartment.id,
        body: {
          name: `${childDepartment.name}-renamed`,
          description: childDepartment.description,
          parentDepartmentId: rootDepartment.id,
        } satisfies IErpHrmTimeDepartment.IUpdate,
      },
    );
  typia.assert(renamedChild);
  TestValidator.equals(
    "renamed child department keeps the same parent",
    renamedChild.parentDepartment?.id,
    rootDepartment.id,
  );
}
