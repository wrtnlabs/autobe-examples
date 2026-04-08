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

export async function test_api_department_update_name_uniqueness(
  connection: api.IConnection,
): Promise<void> {
  const actorConnection: api.IConnection = { host: connection.host };
  const seed: string = typia.random<string>();
  const departmentAName: string = `department-a-${seed}`;
  const departmentBName: string = `department-b-${seed}`;
  const updatedName: string = `department-updated-${seed}`;
  const updatedDescription: string = RandomGenerator.paragraph({
    sentences: 3,
  });
  const departmentA = await api.functional.erpHrmTime.member.departments.create(
    actorConnection,
    {
      body: {
        name: departmentAName,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IErpHrmTimeDepartment.ICreate,
    },
  );
  typia.assert(departmentA);
  const departmentB =
    await generate_random_erp_hrm_time_member_departments_create(
      actorConnection,
      {
        body: {
          name: departmentBName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(departmentB);
  const updatedDepartment =
    await api.functional.erpHrmTime.member.departments.update(actorConnection, {
      departmentId: departmentA.id,
      body: {
        name: updatedName,
        description: updatedDescription,
      } satisfies IErpHrmTimeDepartment.IUpdate,
    });
  typia.assert(updatedDepartment);
  TestValidator.equals(
    "department id should stay the same",
    updatedDepartment.id,
    departmentA.id,
  );
  TestValidator.equals(
    "department name should update",
    updatedDepartment.name,
    updatedName,
  );
  TestValidator.equals(
    "department description should update",
    updatedDepartment.description,
    updatedDescription,
  );
  TestValidator.equals(
    "parent department should remain unchanged when omitted",
    updatedDepartment.parentDepartment,
    departmentA.parentDepartment,
  );
  await TestValidator.error(
    "duplicate department name should be rejected",
    async () => {
      await api.functional.erpHrmTime.member.departments.update(
        actorConnection,
        {
          departmentId: departmentA.id,
          body: {
            name: departmentB.name,
            description: updatedDescription,
          } satisfies IErpHrmTimeDepartment.IUpdate,
        },
      );
    },
  );
  TestValidator.equals(
    "successful update should remain applied after rejected rename",
    updatedDepartment.name,
    updatedName,
  );
  TestValidator.equals(
    "successful update description should remain applied after rejected rename",
    updatedDepartment.description,
    updatedDescription,
  );
}
