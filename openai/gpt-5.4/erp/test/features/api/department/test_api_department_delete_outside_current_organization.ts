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

export async function test_api_department_delete_outside_current_organization(
  connection: api.IConnection,
): Promise<void> {
  const managerAConnection: api.IConnection = { host: connection.host };
  const managerAAuthorized = await authorize_manager_join(managerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(managerAAuthorized);
  const department =
    await generate_random_hrm_time_tracking_manager_departments_create(
      managerAConnection,
      {
        body: {
          name: `dept-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(department);
  const managerBConnection: api.IConnection = { host: connection.host };
  const managerBAuthorized = await authorize_manager_join(managerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(managerBAuthorized);
  TestValidator.notEquals(
    "different managers are created",
    managerAAuthorized.id,
    managerBAuthorized.id,
  );
  await TestValidator.httpError(
    "cross-organization department deletion is blocked",
    [403, 404],
    async () => {
      await api.functional.hrmTimeTracking.manager.departments.erase(
        managerBConnection,
        {
          departmentId: department.id,
        },
      );
    },
  );
}
