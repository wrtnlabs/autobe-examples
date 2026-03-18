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

export async function test_api_department_update_with_same_organization_parent(
  connection: api.IConnection,
): Promise<void> {
  const managerConnection: api.IConnection = { host: connection.host };
  await authorize_manager_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const targetDepartment =
    await generate_random_hrm_time_tracking_manager_departments_create(
      managerConnection,
      {
        body: {
          name: `target-${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IHrmTimeTrackingDepartment.ICreate,
      },
    );
  typia.assert(targetDepartment);
  const parentCandidate =
    await generate_random_hrm_time_tracking_manager_departments_create(
      managerConnection,
      {
        body: {
          name: `parent-${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IHrmTimeTrackingDepartment.ICreate,
      },
    );
  typia.assert(parentCandidate);
  TestValidator.equals(
    "parent candidate starts as top-level department",
    parentCandidate.parent,
    null,
  );
  const updateBody = {
    name: `updated-${RandomGenerator.alphaNumeric(8)}`,
    description: null,
    parentDepartmentId: parentCandidate.id,
  } satisfies IHrmTimeTrackingDepartment.IUpdate;
  const updated =
    await api.functional.hrmTimeTracking.manager.departments.update(
      managerConnection,
      {
        departmentId: targetDepartment.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "department id is preserved",
    updated.id,
    targetDepartment.id,
  );
  TestValidator.equals(
    "organization summary is unchanged",
    updated.organization,
    targetDepartment.organization,
  );
  TestValidator.equals("name is updated", updated.name, updateBody.name);
  TestValidator.equals("description is cleared", updated.description, null);
  TestValidator.equals(
    "created_at is preserved",
    updated.created_at,
    targetDepartment.created_at,
  );
  TestValidator.notEquals(
    "updated_at changes after update",
    updated.updated_at,
    targetDepartment.updated_at,
  );
  TestValidator.equals("department remains active", updated.deleted_at, null);
  TestValidator.predicate("updated parent is present", updated.parent !== null);
  const updatedParent = typia.assert(updated.parent!);
  TestValidator.equals(
    "updated parent id matches selected same-organization parent",
    updatedParent.id,
    parentCandidate.id,
  );
  TestValidator.equals(
    "updated parent name matches selected same-organization parent",
    updatedParent.name,
    parentCandidate.name,
  );
  TestValidator.equals(
    "updated parent description matches selected same-organization parent",
    updatedParent.description,
    parentCandidate.description,
  );
  TestValidator.equals(
    "updated parent remains active in summary",
    updatedParent.deleted_at,
    null,
  );
}
