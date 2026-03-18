import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingManager";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_manager_join } from "../../../authorize/authorize_manager_join";
import { authorize_manager_login } from "../../../authorize/authorize_manager_login";
import { authorize_manager_refresh } from "../../../authorize/authorize_manager_refresh";
import { generate_random_hrm_time_tracking_manager_departments_create } from "../../../generate/generate_random_hrm_time_tracking_manager_departments_create";
import { prepare_random_hrm_time_tracking_department } from "../../../prepare/prepare_random_hrm_time_tracking_department";

export async function test_api_department_detail_cross_organization_hidden(
  connection: api.IConnection,
): Promise<void> {
  const managerOneConnection: api.IConnection = { host: connection.host };
  const managerOneAuth = await authorize_manager_join(managerOneConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(managerOneAuth);
  const departmentInput = {
    name: `dept-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IHrmTimeTrackingDepartment.ICreate;
  const createdDepartment =
    await generate_random_hrm_time_tracking_manager_departments_create(
      managerOneConnection,
      {
        body: departmentInput,
      },
    );
  typia.assert(createdDepartment);
  TestValidator.equals(
    "created department name matches input",
    createdDepartment.name,
    departmentInput.name,
  );
  TestValidator.equals(
    "created department description matches input",
    createdDepartment.description,
    departmentInput.description,
  );
  const managerTwoConnection: api.IConnection = { host: connection.host };
  const managerTwoAuth = await authorize_manager_join(managerTwoConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(managerTwoAuth);
  TestValidator.notEquals(
    "different managers created",
    managerOneAuth.id,
    managerTwoAuth.id,
  );
  await TestValidator.httpError(
    "cross-organization department detail remains hidden",
    404,
    async () => {
      await api.functional.hrmTimeTracking.manager.departments.at(
        managerTwoConnection,
        {
          departmentId: createdDepartment.id,
        },
      );
    },
  );
}
