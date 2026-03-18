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

export async function test_api_department_create_top_level_department(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  const firstBody = {
    name: `department-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IHrmTimeTrackingDepartment.ICreate;
  const created =
    await generate_random_hrm_time_tracking_member_departments_create(
      memberConnection,
      {
        body: firstBody,
      },
    );
  typia.assert(created);
  TestValidator.equals("department name", created.name, firstBody.name);
  TestValidator.equals(
    "department description",
    created.description,
    firstBody.description ?? null,
  );
  TestValidator.equals(
    "top-level department has no parent",
    created.parentDepartment,
    null,
  );
  TestValidator.equals(
    "top-level summary parent is null",
    created.parentDepartment,
    null,
  );
  TestValidator.equals(
    "organization id is present",
    created.organization.id,
    created.organization.id,
  );
  TestValidator.equals(
    "organization name is present",
    created.organization.name,
    created.organization.name,
  );
  const secondBody = {
    name: `department-${RandomGenerator.alphabets(8)}`,
    description: null,
  } satisfies IHrmTimeTrackingDepartment.ICreate;
  const createdSecond =
    await generate_random_hrm_time_tracking_member_departments_create(
      memberConnection,
      {
        body: secondBody,
      },
    );
  typia.assert(createdSecond);
  TestValidator.notEquals(
    "top-level departments should have distinct ids",
    created.id,
    createdSecond.id,
  );
  TestValidator.equals(
    "top-level departments should belong to the same organization context",
    created.organization.id,
    createdSecond.organization.id,
  );
  TestValidator.equals(
    "second top-level department has no parent",
    createdSecond.parentDepartment,
    null,
  );
  TestValidator.equals(
    "second top-level summary parent is null",
    createdSecond.parentDepartment,
    null,
  );
}
