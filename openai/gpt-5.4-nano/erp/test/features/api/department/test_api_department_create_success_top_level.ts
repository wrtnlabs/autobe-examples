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

export async function test_api_department_create_success_top_level(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1,
    href: "https://example.com/join",
    referrer: "https://example.com/ref",
    ip: undefined,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  const departmentName = `dept-${RandomGenerator.alphabets(10)}`;
  const createBody = {
    name: departmentName,
    description: null,
    parent_department_id: null,
  } satisfies IErpHrmTimeTrackingDepartment.ICreate;
  const created =
    await api.functional.erpHrmTimeTracking.member.departments.create(
      memberConnection,
      {
        body: createBody,
      },
    );
  typia.assert(created);
  TestValidator.equals("department name matches", created.name, departmentName);
  TestValidator.equals(
    "department description null",
    created.description,
    null,
  );
  TestValidator.equals(
    "department parentDepartmentId null",
    created.parentDepartmentId,
    null,
  );
  TestValidator.equals("department deletedAt null", created.deletedAt, null);
}
