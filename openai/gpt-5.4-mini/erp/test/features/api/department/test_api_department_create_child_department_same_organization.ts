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

export async function test_api_department_create_child_department_same_organization(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd123!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  const parentDepartment =
    await generate_random_erp_hrm_time_member_departments_create(
      memberConnection,
      {
        body: {
          name: `parent-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IErpHrmTimeDepartment.ICreate,
      },
    );
  typia.assert(parentDepartment);
  const childDepartment =
    await generate_random_erp_hrm_time_member_departments_create(
      memberConnection,
      {
        body: {
          name: `child-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parentDepartmentId: parentDepartment.id,
        } satisfies IErpHrmTimeDepartment.ICreate,
      },
    );
  typia.assert(childDepartment);
  TestValidator.equals(
    "child department parent should match the created parent department",
    childDepartment.parentDepartment?.id,
    parentDepartment.id,
  );
  TestValidator.predicate(
    "child department should be linked to an immediate parent only",
    childDepartment.parentDepartment !== null &&
      childDepartment.parentDepartment.id === parentDepartment.id,
  );
  TestValidator.notEquals(
    "child department should be distinct from its parent",
    childDepartment.id,
    parentDepartment.id,
  );
  TestValidator.equals(
    "child department should remain in the same organization hierarchy",
    childDepartment.organization,
    parentDepartment.organization,
  );
}
