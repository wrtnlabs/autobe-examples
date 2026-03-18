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

export async function test_api_department_create_rejects_duplicate_name_and_deep_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies Partial<IHrmTimeTrackingOwner.IJoin>;
  const authorized = await authorize_owner_join(ownerConnection, {
    body: ownerJoinBody,
  });
  typia.assert(authorized);
  const duplicateName = `dept-duplicate-${RandomGenerator.alphaNumeric(8)}`;
  const originalDepartment =
    await generate_random_hrm_time_tracking_owner_departments_create(
      ownerConnection,
      {
        body: {
          name: duplicateName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IHrmTimeTrackingDepartment.ICreate,
      },
    );
  typia.assert(originalDepartment);
  await TestValidator.error(
    "duplicate department name in same organization",
    async () => {
      await generate_random_hrm_time_tracking_owner_departments_create(
        ownerConnection,
        {
          body: {
            name: duplicateName,
            description: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IHrmTimeTrackingDepartment.ICreate,
        },
      );
    },
  );
  const parentName = `dept-parent-${RandomGenerator.alphaNumeric(8)}`;
  const topLevelDepartment =
    await generate_random_hrm_time_tracking_owner_departments_create(
      ownerConnection,
      {
        body: {
          name: parentName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IHrmTimeTrackingDepartment.ICreate,
      },
    );
  typia.assert(topLevelDepartment);
  const childName = `dept-child-${RandomGenerator.alphaNumeric(8)}`;
  const childDepartment =
    await generate_random_hrm_time_tracking_owner_departments_create(
      ownerConnection,
      {
        body: {
          name: childName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_department_id: topLevelDepartment.id,
        } satisfies IHrmTimeTrackingDepartment.ICreate,
      },
    );
  typia.assert(childDepartment);
  await TestValidator.error(
    "reject grandchild department deeper than one level",
    async () => {
      await generate_random_hrm_time_tracking_owner_departments_create(
        ownerConnection,
        {
          body: {
            name: `dept-grandchild-${RandomGenerator.alphaNumeric(8)}`,
            description: RandomGenerator.paragraph({ sentences: 2 }),
            parent_department_id: childDepartment.id,
          } satisfies IHrmTimeTrackingDepartment.ICreate,
        },
      );
    },
  );
  TestValidator.equals(
    "original department keeps duplicate target name",
    originalDepartment.name,
    duplicateName,
  );
  TestValidator.equals(
    "original and hierarchy setup departments are in same organization",
    originalDepartment.organization.id,
    topLevelDepartment.organization.id,
  );
  TestValidator.equals(
    "top level department keeps expected name",
    topLevelDepartment.name,
    parentName,
  );
  TestValidator.equals(
    "top level department has no parent",
    topLevelDepartment.parent,
    null,
  );
  TestValidator.notEquals(
    "child department is distinct from top level department",
    childDepartment.id,
    topLevelDepartment.id,
  );
  TestValidator.equals(
    "child belongs to same organization as top level department",
    childDepartment.organization.id,
    topLevelDepartment.organization.id,
  );
  TestValidator.equals(
    "child keeps expected name",
    childDepartment.name,
    childName,
  );
  TestValidator.equals(
    "child parent id matches top level department id",
    childDepartment.parent?.id,
    topLevelDepartment.id,
  );
  TestValidator.equals(
    "child parent name matches top level department name",
    childDepartment.parent?.name,
    topLevelDepartment.name,
  );
}
