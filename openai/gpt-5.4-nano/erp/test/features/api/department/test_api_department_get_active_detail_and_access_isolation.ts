import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingDepartment";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_tracking_member_departments_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_departments_create";
import { prepare_random_erp_hrm_time_tracking_department } from "../../../prepare/prepare_random_erp_hrm_time_tracking_department";

export async function test_api_department_get_active_detail_and_access_isolation(
  connection: api.IConnection,
): Promise<void> {
  const memberConnectionA: api.IConnection = { host: connection.host };
  const joinBodyA: IErpHrmTimeTrackingMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password#1234!",
    organizationName: `orgA-${RandomGenerator.alphabets(8)}`,
    organizationDescription: `descA-${RandomGenerator.alphabets(8)}`,
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1,
    href: `https://example.com/href/${RandomGenerator.alphabets(8)}`,
    referrer: `https://example.com/ref/${RandomGenerator.alphabets(8)}`,
    ip: null,
  };

  const authA = await authorize_member_join(memberConnectionA, { body: joinBodyA });
  typia.assert(authA);

  const parentDeptA = await generate_random_erp_hrm_time_tracking_member_departments_create(
    memberConnectionA,
    {},
  );
  typia.assert(parentDeptA);

  const childDeptA = await generate_random_erp_hrm_time_tracking_member_departments_create(
    memberConnectionA,
    {
      body: {
        parent_department_id: parentDeptA.id,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        name: `deptA-child-${RandomGenerator.alphabets(10)}`,
      },
    },
  );
  typia.assert(childDeptA);

  const detailChildA = await api.functional.erpHrmTimeTracking.member.departments.at(
    memberConnectionA,
    { departmentId: childDeptA.id },
  );
  typia.assert(detailChildA);
  TestValidator.equals("id matches", detailChildA.id, childDeptA.id);
  TestValidator.equals("name matches", detailChildA.name, childDeptA.name);
  TestValidator.equals("description matches", detailChildA.description, childDeptA.description);
  TestValidator.equals(
    "parentDepartmentId matches",
    detailChildA.parentDepartmentId,
    parentDeptA.id,
  );

  const rootDeptA = await generate_random_erp_hrm_time_tracking_member_departments_create(
    memberConnectionA,
    {
      body: {
        parent_department_id: null,
        description: null,
        name: `deptA-root-${RandomGenerator.alphabets(10)}`,
      },
    },
  );
  typia.assert(rootDeptA);

  const detailRootA = await api.functional.erpHrmTimeTracking.member.departments.at(
    memberConnectionA,
    { departmentId: rootDeptA.id },
  );
  typia.assert(detailRootA);
  TestValidator.equals(
    "root parentDepartmentId is null",
    detailRootA.parentDepartmentId,
    null,
  );
}
