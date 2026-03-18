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

export async function test_api_department_create_rejects_deep_hierarchy_and_duplicate_name(
  connection: api.IConnection,
): Promise<void> {
  const managerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_manager_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Aa1!" + RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const topLevelName = `dept-top-${RandomGenerator.alphabets(8)}`;
  const topLevelDescription = RandomGenerator.paragraph({ sentences: 3 });
  const topLevel =
    await generate_random_hrm_time_tracking_manager_departments_create(
      managerConnection,
      {
        body: {
          name: topLevelName,
          description: topLevelDescription,
        },
      },
    );
  typia.assert(topLevel);
  TestValidator.equals("top-level name matches", topLevel.name, topLevelName);
  TestValidator.equals(
    "top-level description matches",
    topLevel.description,
    topLevelDescription,
  );
  TestValidator.equals("top-level has no parent", topLevel.parent, null);
  TestValidator.equals("top-level is active", topLevel.deleted_at, null);
  const childName = `dept-child-${RandomGenerator.alphabets(8)}`;
  const childDescription = RandomGenerator.paragraph({ sentences: 2 });
  const child =
    await generate_random_hrm_time_tracking_manager_departments_create(
      managerConnection,
      {
        body: {
          name: childName,
          description: childDescription,
          parent_department_id: topLevel.id,
        },
      },
    );
  typia.assert(child);
  TestValidator.equals("child name matches", child.name, childName);
  TestValidator.equals(
    "child description matches",
    child.description,
    childDescription,
  );
  TestValidator.notEquals("child has parent", child.parent, null);
  TestValidator.equals(
    "child parent id matches",
    child.parent!.id,
    topLevel.id,
  );
  TestValidator.equals(
    "child parent name matches",
    child.parent!.name,
    topLevel.name,
  );
  TestValidator.equals(
    "child organization matches top-level organization",
    child.organization.id,
    topLevel.organization.id,
  );
  TestValidator.equals("child is active", child.deleted_at, null);
  const topLevelSnapshot = {
    id: topLevel.id,
    organizationId: topLevel.organization.id,
    parent: topLevel.parent,
    name: topLevel.name,
    description: topLevel.description,
    deletedAt: topLevel.deleted_at,
  };
  const childSnapshot = {
    id: child.id,
    organizationId: child.organization.id,
    parentId: child.parent!.id,
    parentName: child.parent!.name,
    name: child.name,
    description: child.description,
    deletedAt: child.deleted_at,
  };
  const grandchildBody = {
    name: `dept-grandchild-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    parent_department_id: child.id,
  } satisfies IHrmTimeTrackingDepartment.ICreate;
  await TestValidator.error(
    "rejects deep hierarchy beyond one level",
    async () => {
      await generate_random_hrm_time_tracking_manager_departments_create(
        managerConnection,
        {
          body: grandchildBody,
        },
      );
    },
  );
  const duplicateNameBody = {
    name: topLevel.name,
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IHrmTimeTrackingDepartment.ICreate;
  await TestValidator.error(
    "rejects duplicate active department name in same organization",
    async () => {
      await generate_random_hrm_time_tracking_manager_departments_create(
        managerConnection,
        {
          body: duplicateNameBody,
        },
      );
    },
  );
  TestValidator.equals(
    "top-level id unchanged",
    topLevel.id,
    topLevelSnapshot.id,
  );
  TestValidator.equals(
    "top-level organization unchanged",
    topLevel.organization.id,
    topLevelSnapshot.organizationId,
  );
  TestValidator.equals(
    "top-level parent unchanged",
    topLevel.parent,
    topLevelSnapshot.parent,
  );
  TestValidator.equals(
    "top-level name unchanged",
    topLevel.name,
    topLevelSnapshot.name,
  );
  TestValidator.equals(
    "top-level description unchanged",
    topLevel.description,
    topLevelSnapshot.description,
  );
  TestValidator.equals(
    "top-level deleted_at unchanged",
    topLevel.deleted_at,
    topLevelSnapshot.deletedAt,
  );
  TestValidator.equals("child id unchanged", child.id, childSnapshot.id);
  TestValidator.equals(
    "child organization unchanged",
    child.organization.id,
    childSnapshot.organizationId,
  );
  TestValidator.equals(
    "child parent id unchanged",
    child.parent!.id,
    childSnapshot.parentId,
  );
  TestValidator.equals(
    "child parent name unchanged",
    child.parent!.name,
    childSnapshot.parentName,
  );
  TestValidator.equals("child name unchanged", child.name, childSnapshot.name);
  TestValidator.equals(
    "child description unchanged",
    child.description,
    childSnapshot.description,
  );
  TestValidator.equals(
    "child deleted_at unchanged",
    child.deleted_at,
    childSnapshot.deletedAt,
  );
}
