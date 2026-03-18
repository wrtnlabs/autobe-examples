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

export async function test_api_department_detail_child_with_parent(
  connection: api.IConnection,
): Promise<void> {
  const managerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_manager_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const parentInput = {
    name: `parent-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IHrmTimeTrackingDepartment.ICreate;
  const parentDepartment =
    await generate_random_hrm_time_tracking_manager_departments_create(
      managerConnection,
      {
        body: parentInput,
      },
    );
  typia.assert(parentDepartment);
  const childInput = {
    name: `child-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    parent_department_id: parentDepartment.id,
  } satisfies IHrmTimeTrackingDepartment.ICreate;
  const childDepartment =
    await generate_random_hrm_time_tracking_manager_departments_create(
      managerConnection,
      {
        body: childInput,
      },
    );
  typia.assert(childDepartment);
  const found = await api.functional.hrmTimeTracking.manager.departments.at(
    managerConnection,
    {
      departmentId: childDepartment.id,
    },
  );
  typia.assert(found);
  TestValidator.equals(
    "child department id matches",
    found.id,
    childDepartment.id,
  );
  TestValidator.equals(
    "child department name matches",
    found.name,
    childInput.name,
  );
  TestValidator.equals(
    "child department description matches",
    found.description,
    childInput.description ?? null,
  );
  TestValidator.equals(
    "department remains in active organization",
    found.organization.id,
    childDepartment.organization.id,
  );
  TestValidator.equals(
    "parent and child belong to same organization",
    found.organization.id,
    parentDepartment.organization.id,
  );
  TestValidator.predicate("parent summary exists", found.parent !== null);
  const parent: IHrmTimeTrackingDepartment.ISummary = found.parent!;
  TestValidator.equals(
    "parent id matches immediate parent",
    parent.id,
    parentDepartment.id,
  );
  TestValidator.equals(
    "parent name matches immediate parent",
    parent.name,
    parentDepartment.name,
  );
  TestValidator.equals(
    "parent description matches immediate parent",
    parent.description,
    parentDepartment.description,
  );
  const parentKeys = Object.keys(parent).sort();
  TestValidator.equals("parent is returned as summary only", parentKeys, [
    "created_at",
    "deleted_at",
    "description",
    "id",
    "name",
    "updated_at",
  ]);
}
