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

export async function test_api_department_update_invalid_parent_structure_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const joinPayload: IErpHrmTimeTrackingMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password_1234!",
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1,
    href: "https://example.com/href" satisfies string & tags.Format<"uri">,
    referrer: "https://example.com/referrer" satisfies string &
      tags.Format<"uri">,
    ip: typia.random<string & tags.Format<"ipv4">>(),
  };
  const authorized: IErpHrmTimeTrackingMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: joinPayload,
    });
  typia.assert(authorized);
  // 2) Create hierarchy nodes in same organization
  const parentLevel1: IErpHrmTimeTrackingDepartment =
    await generate_random_erp_hrm_time_tracking_member_departments_create(
      memberConnection,
      {
        body: {
          name: `ParentL1-${RandomGenerator.alphabets(8)}`,
          description: null,
          parent_department_id: null,
        },
      },
    );
  typia.assert(parentLevel1);
  const parentLevel2: IErpHrmTimeTrackingDepartment =
    await generate_random_erp_hrm_time_tracking_member_departments_create(
      memberConnection,
      {
        body: {
          name: `ParentL2-${RandomGenerator.alphabets(8)}`,
          description: null,
          parent_department_id: parentLevel1.id,
        },
      },
    );
  typia.assert(parentLevel2);
  const targetDepartmentBefore: IErpHrmTimeTrackingDepartment =
    await generate_random_erp_hrm_time_tracking_member_departments_create(
      memberConnection,
      {
        body: {
          name: `Target-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_department_id: null,
        },
      },
    );
  typia.assert(targetDepartmentBefore);
  // 3) Attempt invalid update: make target's parent = parentLevel2
  const attemptedName: string = `TargetUpdated-${RandomGenerator.alphabets(10)}`;
  const attemptedDescription: string = RandomGenerator.paragraph({
    sentences: 3,
  });
  const updateBody: IErpHrmTimeTrackingDepartment.IUpdate = {
    name: attemptedName,
    description: attemptedDescription,
    parentDepartmentId: parentLevel2.id,
  };
  const departmentId: string & tags.Format<"uuid"> = targetDepartmentBefore.id;
  await TestValidator.error(
    "should reject department update that creates deeper than one nesting level",
    async () => {
      await api.functional.erpHrmTimeTracking.member.departments.update(
        memberConnection,
        {
          departmentId,
          body: updateBody,
        },
      );
    },
  );
  // Note: state consistency (no partial update) requires a department read endpoint,
  // which is not available in the provided API surface for this task.
}
