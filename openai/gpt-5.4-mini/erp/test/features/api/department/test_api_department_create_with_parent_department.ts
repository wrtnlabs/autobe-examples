import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_departments_create } from "../../../generate/generate_random_hrm_time_tracking_member_departments_create";
import { prepare_random_hrm_time_tracking_department } from "../../../prepare/prepare_random_hrm_time_tracking_department";

export async function test_api_department_create_with_parent_department(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(joined);
  const parentDepartment =
    await api.functional.hrmTimeTracking.member.departments.create(
      memberConnection,
      {
        body: {
          name: `${RandomGenerator.name(2)} Parent`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IHrmTimeTrackingDepartment.ICreate,
      },
    );
  typia.assert(parentDepartment);
  TestValidator.equals(
    "parent department should be root level",
    parentDepartment.parentDepartment,
    null,
  );
  const childDepartment =
    await api.functional.hrmTimeTracking.member.departments.create(
      memberConnection,
      {
        body: {
          name: `${RandomGenerator.name(2)} Child`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parentDepartmentId: parentDepartment.id,
        } satisfies IHrmTimeTrackingDepartment.ICreate,
      },
    );
  typia.assert(childDepartment);
  TestValidator.equals(
    "child department should reference the created parent",
    childDepartment.parentDepartment?.id,
    parentDepartment.id,
  );
  TestValidator.equals(
    "child department should belong to the same organization as the parent",
    childDepartment.organization.id,
    parentDepartment.organization.id,
  );
  TestValidator.equals(
    "child department summary should store the parent identifier",
    childDepartment.parentDepartment?.id,
    childDepartment.parentDepartment?.id,
  );
}
