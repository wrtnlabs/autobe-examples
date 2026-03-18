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

export async function test_api_department_delete_in_current_organization(
  connection: api.IConnection,
): Promise<void> {
  const managerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_manager_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const departmentName = `dept-${RandomGenerator.alphabets(8)}`;
  const departmentDescription = RandomGenerator.paragraph({ sentences: 3 });
  const department =
    await generate_random_hrm_time_tracking_manager_departments_create(
      managerConnection,
      {
        body: {
          name: departmentName,
          description: departmentDescription,
        },
      },
    );
  typia.assert(department);
  TestValidator.equals(
    "department name matches input",
    department.name,
    departmentName,
  );
  TestValidator.equals(
    "department description matches input",
    department.description,
    departmentDescription,
  );
  TestValidator.predicate(
    "department belongs to a named current organization",
    department.organization.name.length > 0,
  );
  TestValidator.equals(
    "department is active before deletion",
    department.deleted_at,
    null,
  );
  TestValidator.equals(
    "department has no parent by default",
    department.parent,
    null,
  );
  const output = await api.functional.hrmTimeTracking.manager.departments.erase(
    managerConnection,
    {
      departmentId: department.id,
    },
  );
  TestValidator.equals("delete returns no response body", output, undefined);
  TestValidator.equals(
    "manager authorization header remains available for organization-scoped workflow",
    typeof managerConnection.headers?.Authorization === "string",
    true,
  );
}
