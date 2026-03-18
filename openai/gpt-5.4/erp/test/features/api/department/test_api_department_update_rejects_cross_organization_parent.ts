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

export async function test_api_department_update_rejects_cross_organization_parent(
  connection: api.IConnection,
): Promise<void> {
  const firstOwnerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(firstOwnerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const targetDepartment =
    await generate_random_hrm_time_tracking_owner_departments_create(
      firstOwnerConnection,
      {
        body: {
          name: `target-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          parent_department_id: null,
        },
      },
    );
  typia.assert(targetDepartment);
  const secondOwnerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(secondOwnerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const foreignParentDepartment =
    await generate_random_hrm_time_tracking_owner_departments_create(
      secondOwnerConnection,
      {
        body: {
          name: `foreign-parent-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_department_id: null,
        },
      },
    );
  typia.assert(foreignParentDepartment);
  TestValidator.notEquals(
    "departments belong to different organizations",
    targetDepartment.organization.id,
    foreignParentDepartment.organization.id,
  );
  TestValidator.equals(
    "target department starts as top-level",
    targetDepartment.parent,
    null,
  );
  TestValidator.equals(
    "foreign parent starts as top-level",
    foreignParentDepartment.parent,
    null,
  );
  const originalOrganizationId = targetDepartment.organization.id;
  const originalParent = targetDepartment.parent;
  const originalName = targetDepartment.name;
  const originalDescription = targetDepartment.description;
  const attemptedUpdate = {
    name: `${originalName}-mutated`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    parentDepartmentId: foreignParentDepartment.id,
  } satisfies IHrmTimeTrackingDepartment.IUpdate;
  await TestValidator.error(
    "rejects cross-organization parent department update",
    async () => {
      await api.functional.hrmTimeTracking.owner.departments.update(
        firstOwnerConnection,
        {
          departmentId: targetDepartment.id,
          body: attemptedUpdate,
        },
      );
    },
  );
  TestValidator.equals(
    "captured original organization linkage stays first organization",
    originalOrganizationId,
    targetDepartment.organization.id,
  );
  TestValidator.equals(
    "captured original parent state stays top-level",
    originalParent,
    null,
  );
  TestValidator.equals(
    "captured original name remains the pre-failure value",
    originalName,
    targetDepartment.name,
  );
  TestValidator.equals(
    "captured original description remains the pre-failure value",
    originalDescription,
    targetDepartment.description,
  );
}
