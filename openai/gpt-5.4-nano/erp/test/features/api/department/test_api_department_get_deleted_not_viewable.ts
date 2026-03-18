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

export async function test_api_department_get_deleted_not_viewable(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    organizationName: `org-${RandomGenerator.alphabets(8)}`,
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    href: `https://example.com/${RandomGenerator.alphabets(6)}`,
    referrer: `https://example.com/ref/${RandomGenerator.alphabets(6)}`,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  await authorize_member_join(memberConnection, { body: joinInput });
  const department =
    await generate_random_erp_hrm_time_tracking_member_departments_create(
      memberConnection,
      {
        body: {
          name: `dept-${RandomGenerator.alphabets(10)}`,
          description:
            Math.random() > 0.5
              ? RandomGenerator.paragraph({ sentences: 1 })
              : null,
          parent_department_id: null,
        } satisfies IErpHrmTimeTrackingDepartment.ICreate,
      },
    );
  typia.assert(department);
  const departmentId = department.id;
  await api.functional.erpHrmTimeTracking.member.departments.erase(
    memberConnection,
    {
      departmentId,
    },
  );
  await TestValidator.httpError(
    "deleted department should not be retrievable",
    [400, 401, 403, 404],
    async () => {
      await api.functional.erpHrmTimeTracking.member.departments.at(
        memberConnection,
        { departmentId },
      );
    },
  );
}
