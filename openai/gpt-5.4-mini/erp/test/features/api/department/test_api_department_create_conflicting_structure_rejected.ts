import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
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

export async function test_api_department_create_conflicting_structure_rejected(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const email = `dept-owner-${typia.random<string & tags.Format<"uuid">>()}@test.com`;
  await authorize_member_join(memberConnection, {
    body: {
      email,
      password: "P@ssw0rd123!",
      name: RandomGenerator.name(),
      href: "https://example.com/erp/signup",
      referrer: "https://example.com/erp",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  const rootName = `dept-root-${RandomGenerator.alphabets(8)}`;
  const rootDepartment =
    await api.functional.erpHrmTime.member.departments.create(
      memberConnection,
      {
        body: {
          name: rootName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IErpHrmTimeDepartment.ICreate,
      },
    );
  typia.assert(rootDepartment);
  const childName = `dept-child-${RandomGenerator.alphabets(8)}`;
  const childDepartment =
    await api.functional.erpHrmTime.member.departments.create(
      memberConnection,
      {
        body: {
          name: childName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parentDepartmentId: rootDepartment.id,
        } satisfies IErpHrmTimeDepartment.ICreate,
      },
    );
  typia.assert(childDepartment);
  await TestValidator.error(
    "duplicate department structure should be rejected",
    async () => {
      await api.functional.erpHrmTime.member.departments.create(
        memberConnection,
        {
          body: {
            name: rootName,
            description: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IErpHrmTimeDepartment.ICreate,
        },
      );
    },
  );
  await TestValidator.error(
    "invalid parent department should be rejected",
    async () => {
      await api.functional.erpHrmTime.member.departments.create(
        memberConnection,
        {
          body: {
            name: `dept-cross-${RandomGenerator.alphabets(8)}`,
            description: RandomGenerator.paragraph({ sentences: 2 }),
            parentDepartmentId: typia.random<string & tags.Format<"uuid">>(),
          } satisfies IErpHrmTimeDepartment.ICreate,
        },
      );
    },
  );
  await TestValidator.error(
    "deeper than one-level hierarchy should be rejected",
    async () => {
      await api.functional.erpHrmTime.member.departments.create(
        memberConnection,
        {
          body: {
            name: `dept-grandchild-${RandomGenerator.alphabets(8)}`,
            description: RandomGenerator.paragraph({ sentences: 2 }),
            parentDepartmentId: childDepartment.id,
          } satisfies IErpHrmTimeDepartment.ICreate,
        },
      );
    },
  );
  const siblingDepartment =
    await api.functional.erpHrmTime.member.departments.create(
      memberConnection,
      {
        body: {
          name: `dept-unique-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IErpHrmTimeDepartment.ICreate,
      },
    );
  typia.assert(siblingDepartment);
  TestValidator.notEquals(
    "created department should not reuse rejected duplicate name",
    siblingDepartment.name,
    rootName,
  );
}
