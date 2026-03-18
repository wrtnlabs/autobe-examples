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

export async function test_api_department_update_parent_rejects_deeper_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingOwner.IJoin,
  });
  typia.assert(owner);
  const topLevelBody = {
    name: `dept-top-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IHrmTimeTrackingDepartment.ICreate;
  const topLevel =
    await generate_random_hrm_time_tracking_owner_departments_create(
      ownerConnection,
      {
        body: topLevelBody,
      },
    );
  typia.assert(topLevel);
  const childBody = {
    name: `dept-child-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    parent_department_id: topLevel.id,
  } satisfies IHrmTimeTrackingDepartment.ICreate;
  const child =
    await generate_random_hrm_time_tracking_owner_departments_create(
      ownerConnection,
      {
        body: childBody,
      },
    );
  typia.assert(child);
  const targetBody = {
    name: `dept-target-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IHrmTimeTrackingDepartment.ICreate;
  const target =
    await generate_random_hrm_time_tracking_owner_departments_create(
      ownerConnection,
      {
        body: targetBody,
      },
    );
  typia.assert(target);
  const expectedTopLevelParentId = topLevel.id;
  const expectedTargetId = target.id;
  const expectedTargetOrganizationId = target.organization.id;
  const expectedTargetName = target.name;
  const expectedTargetDescription = target.description;
  const expectedTargetParentId = target.parent?.id ?? null;
  TestValidator.equals(
    "top-level department has no parent",
    topLevel.parent,
    null,
  );
  TestValidator.notEquals("child differs from target", child.id, target.id);
  TestValidator.equals(
    "child belongs to same organization as target",
    child.organization.id,
    target.organization.id,
  );
  TestValidator.equals(
    "child parent is the top-level department",
    child.parent?.id ?? null,
    expectedTopLevelParentId,
  );
  TestValidator.equals(
    "target initially has no parent",
    expectedTargetParentId,
    null,
  );
  const invalidUpdateBody = {
    name: `dept-updated-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    parentDepartmentId: child.id,
  } satisfies IHrmTimeTrackingDepartment.IUpdate;
  await TestValidator.httpError(
    "reject update when selected parent already has its own parent",
    [400, 403, 404, 409, 422],
    async () => {
      await api.functional.hrmTimeTracking.owner.departments.update(
        ownerConnection,
        {
          departmentId: target.id,
          body: invalidUpdateBody,
        },
      );
    },
  );
  TestValidator.equals(
    "target id remains unchanged",
    target.id,
    expectedTargetId,
  );
  TestValidator.equals(
    "target organization remains unchanged",
    target.organization.id,
    expectedTargetOrganizationId,
  );
  TestValidator.equals(
    "target name remains original after rejected update",
    target.name,
    expectedTargetName,
  );
  TestValidator.equals(
    "target description remains original after rejected update",
    target.description,
    expectedTargetDescription,
  );
  TestValidator.equals(
    "target parent remains null after rejected update",
    target.parent?.id ?? null,
    expectedTargetParentId,
  );
  TestValidator.equals(
    "child remains under top-level parent after rejected sibling update",
    child.parent?.id ?? null,
    expectedTopLevelParentId,
  );
}
