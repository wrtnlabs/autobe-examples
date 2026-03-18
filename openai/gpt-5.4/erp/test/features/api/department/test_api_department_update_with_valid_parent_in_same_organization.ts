import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_hrm_time_tracking_owner_departments_create } from "../../../generate/generate_random_hrm_time_tracking_owner_departments_create";
import { prepare_random_hrm_time_tracking_department } from "../../../prepare/prepare_random_hrm_time_tracking_department";

export async function test_api_department_update_with_valid_parent_in_same_organization(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_owner_join(ownerConnection, {});
  typia.assert(authorized);
  const parentDepartment =
    await generate_random_hrm_time_tracking_owner_departments_create(
      ownerConnection,
      {
        body: {
          name: `parent-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(parentDepartment);
  const targetDepartment =
    await generate_random_hrm_time_tracking_owner_departments_create(
      ownerConnection,
      {
        body: {
          name: `target-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(targetDepartment);
  TestValidator.equals(
    "target department starts as top-level",
    targetDepartment.parent,
    null,
  );
  const updateBody = {
    name: `updated-${RandomGenerator.alphabets(10)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    parentDepartmentId: parentDepartment.id,
  } satisfies IHrmTimeTrackingDepartment.IUpdate;
  const updatedDepartment =
    await api.functional.hrmTimeTracking.owner.departments.update(
      ownerConnection,
      {
        departmentId: targetDepartment.id,
        body: updateBody,
      },
    );
  typia.assert(updatedDepartment);
  TestValidator.equals(
    "department id remains unchanged",
    updatedDepartment.id,
    targetDepartment.id,
  );
  TestValidator.equals(
    "organization remains unchanged",
    updatedDepartment.organization,
    targetDepartment.organization,
  );
  TestValidator.equals(
    "name is updated",
    updatedDepartment.name,
    updateBody.name,
  );
  TestValidator.equals(
    "description is updated",
    updatedDepartment.description,
    updateBody.description,
  );
  TestValidator.equals(
    "created_at remains unchanged",
    updatedDepartment.created_at,
    targetDepartment.created_at,
  );
  TestValidator.notEquals(
    "updated_at changes after update",
    updatedDepartment.updated_at,
    targetDepartment.updated_at,
  );
  TestValidator.equals(
    "deleted_at remains unchanged",
    updatedDepartment.deleted_at,
    targetDepartment.deleted_at,
  );
  TestValidator.predicate(
    "parent is assigned after update",
    updatedDepartment.parent !== null,
  );
  TestValidator.equals(
    "parent id matches selected parent department",
    updatedDepartment.parent!.id,
    parentDepartment.id,
  );
  TestValidator.equals(
    "parent name matches selected parent department",
    updatedDepartment.parent!.name,
    parentDepartment.name,
  );
  TestValidator.equals(
    "parent description matches selected parent department",
    updatedDepartment.parent!.description,
    parentDepartment.description,
  );
}
