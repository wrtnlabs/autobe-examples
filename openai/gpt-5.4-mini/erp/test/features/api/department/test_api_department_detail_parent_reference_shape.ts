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

export async function test_api_department_detail_parent_reference_shape(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email:
        `member_${RandomGenerator.alphabets(10)}@test.com` satisfies string,
      password: `P@ssw0rd${RandomGenerator.alphabets(6)}!`,
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/referrer",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  const topDepartment =
    await generate_random_erp_hrm_time_member_departments_create(
      memberConnection,
      {
        body: {
          name: `Top ${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(topDepartment);
  const topDepartmentDetail =
    await api.functional.erpHrmTime.member.departments.at(memberConnection, {
      departmentId: topDepartment.id,
    });
  typia.assert(topDepartmentDetail);
  TestValidator.equals(
    "top-level department parent should be null",
    topDepartmentDetail.parentDepartment,
    null,
  );
  TestValidator.equals(
    "top-level department id should match",
    topDepartmentDetail.id,
    topDepartment.id,
  );
  TestValidator.equals(
    "top-level department name should match",
    topDepartmentDetail.name,
    topDepartment.name,
  );
  const childDepartment =
    await generate_random_erp_hrm_time_member_departments_create(
      memberConnection,
      {
        body: {
          name: `Child ${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parentDepartmentId: topDepartment.id,
        },
      },
    );
  typia.assert(childDepartment);
  const childDepartmentDetail =
    await api.functional.erpHrmTime.member.departments.at(memberConnection, {
      departmentId: childDepartment.id,
    });
  typia.assert(childDepartmentDetail);
  TestValidator.predicate(
    "child department should expose immediate parent reference",
    childDepartmentDetail.parentDepartment !== null,
  );
  typia.assertGuard<IErpHrmTimeDepartment.ISummary>(
    childDepartmentDetail.parentDepartment,
  );
  TestValidator.equals(
    "child department parent id should match top-level department",
    childDepartmentDetail.parentDepartment.id,
    topDepartment.id,
  );
  TestValidator.equals(
    "child department parent name should match top-level department",
    childDepartmentDetail.parentDepartment.name,
    topDepartment.name,
  );
  TestValidator.equals(
    "child department parent description should match top-level department",
    childDepartmentDetail.parentDepartment.description,
    topDepartment.description,
  );
  TestValidator.equals(
    "child department parent should not recursively expand deeper parent",
    childDepartmentDetail.parentDepartment.parentDepartment,
    null,
  );
}
