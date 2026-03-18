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

export async function test_api_department_update_rejects_deeper_hierarchy_parent(
  connection: api.IConnection,
): Promise<void> {
  const managerConnection: api.IConnection = { host: connection.host };
  const password = `Pw-${RandomGenerator.alphaNumeric(16)}!`;
  const authorized = await authorize_manager_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const topLevelParent =
    await generate_random_hrm_time_tracking_manager_departments_create(
      managerConnection,
      {
        body: {
          name: `top-level-parent-${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_department_id: null,
        } satisfies IHrmTimeTrackingDepartment.ICreate,
      },
    );
  typia.assert(topLevelParent);
  const childDepartment =
    await generate_random_hrm_time_tracking_manager_departments_create(
      managerConnection,
      {
        body: {
          name: `child-department-${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_department_id: topLevelParent.id,
        } satisfies IHrmTimeTrackingDepartment.ICreate,
      },
    );
  typia.assert(childDepartment);
  const targetDepartment =
    await generate_random_hrm_time_tracking_manager_departments_create(
      managerConnection,
      {
        body: {
          name: `target-department-${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_department_id: null,
        } satisfies IHrmTimeTrackingDepartment.ICreate,
      },
    );
  typia.assert(targetDepartment);
  const originalName = targetDepartment.name;
  const originalDescription = targetDepartment.description;
  const originalParent = targetDepartment.parent;
  const originalOrganizationId = targetDepartment.organization.id;
  const invalidUpdateBody = {
    name: `updated-target-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    parentDepartmentId: childDepartment.id,
  } satisfies IHrmTimeTrackingDepartment.IUpdate;
  await TestValidator.error(
    "reject update when parent already has its own parent",
    async () => {
      await api.functional.hrmTimeTracking.manager.departments.update(
        managerConnection,
        {
          departmentId: targetDepartment.id,
          body: invalidUpdateBody,
        },
      );
    },
  );
  TestValidator.equals(
    "target department name remains unchanged after rejected update attempt",
    targetDepartment.name,
    originalName,
  );
  TestValidator.equals(
    "target department description remains unchanged after rejected update attempt",
    targetDepartment.description,
    originalDescription,
  );
  TestValidator.equals(
    "target department parent remains unchanged after rejected update attempt",
    targetDepartment.parent,
    originalParent,
  );
  TestValidator.equals(
    "target department organization remains unchanged after rejected update attempt",
    targetDepartment.organization.id,
    originalOrganizationId,
  );
}
