import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingManager";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingEmployee";
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

export async function test_api_employee_directory_after_department_deletion(
  connection: api.IConnection,
): Promise<void> {
  const managerConnection: api.IConnection = { host: connection.host };
  await authorize_manager_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies DeepPartial<IHrmTimeTrackingManager.IJoin>,
  });
  const department =
    await generate_random_hrm_time_tracking_manager_departments_create(
      managerConnection,
      {
        body: {
          name: `dept-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies DeepPartial<IHrmTimeTrackingDepartment.ICreate>,
      },
    );
  typia.assert(department);
  await api.functional.hrmTimeTracking.manager.departments.erase(
    managerConnection,
    {
      departmentId: department.id,
    },
  );
  const directory = await api.functional.hrmTimeTracking.employees.index(
    managerConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IHrmTimeTrackingEmployee.IRequest,
    },
  );
  typia.assert(directory);
  await TestValidator.httpError(
    "deleted department filter rejected",
    [400, 404, 422, 500, 503],
    async () => {
      await api.functional.hrmTimeTracking.employees.index(managerConnection, {
        body: {
          departmentId: department.id,
          page: 1,
          limit: 20,
        } satisfies IHrmTimeTrackingEmployee.IRequest,
      });
    },
  );
}
