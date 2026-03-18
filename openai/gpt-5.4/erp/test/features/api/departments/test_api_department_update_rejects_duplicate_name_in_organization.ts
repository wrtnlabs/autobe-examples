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

export async function test_api_department_update_rejects_duplicate_name_in_organization(
  connection: api.IConnection,
): Promise<void> {
  const managerConnection: api.IConnection = { host: connection.host };
  typia.assert(
    await authorize_manager_join(managerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    }),
  );
  const originalTargetName = `target-${RandomGenerator.alphaNumeric(8)}`;
  const originalTargetDescription = RandomGenerator.paragraph({ sentences: 3 });
  const conflictingName = `conflict-${RandomGenerator.alphaNumeric(8)}`;
  const conflictingDescription = RandomGenerator.paragraph({ sentences: 4 });
  const targetDepartment =
    await generate_random_hrm_time_tracking_manager_departments_create(
      managerConnection,
      {
        body: {
          name: originalTargetName,
          description: originalTargetDescription,
        },
      },
    );
  typia.assert(targetDepartment);
  const conflictingDepartment =
    await generate_random_hrm_time_tracking_manager_departments_create(
      managerConnection,
      {
        body: {
          name: conflictingName,
          description: conflictingDescription,
        },
      },
    );
  typia.assert(conflictingDepartment);
  TestValidator.notEquals(
    "created departments must be distinct resources",
    targetDepartment.id,
    conflictingDepartment.id,
  );
  TestValidator.notEquals(
    "created department names must start distinct",
    targetDepartment.name,
    conflictingDepartment.name,
  );
  TestValidator.notEquals(
    "created department descriptions must start distinct",
    targetDepartment.description,
    conflictingDepartment.description,
  );
  const targetSnapshot = {
    id: targetDepartment.id,
    organizationId: targetDepartment.organization.id,
    name: targetDepartment.name,
    description: targetDepartment.description,
    createdAt: targetDepartment.created_at,
  };
  const conflictingSnapshot = {
    id: conflictingDepartment.id,
    organizationId: conflictingDepartment.organization.id,
    name: conflictingDepartment.name,
    description: conflictingDepartment.description,
    createdAt: conflictingDepartment.created_at,
  };
  TestValidator.equals(
    "departments belong to same organization",
    targetSnapshot.organizationId,
    conflictingSnapshot.organizationId,
  );
  await TestValidator.error(
    "updating department to duplicate active name in same organization must be rejected",
    async () => {
      await api.functional.hrmTimeTracking.manager.departments.update(
        managerConnection,
        {
          departmentId: targetDepartment.id,
          body: {
            name: conflictingSnapshot.name,
          } satisfies IHrmTimeTrackingDepartment.IUpdate,
        },
      );
    },
  );
  TestValidator.equals(
    "target department name snapshot remains unchanged after failed update",
    targetSnapshot.name,
    originalTargetName,
  );
  TestValidator.equals(
    "target department description snapshot remains unchanged after failed update",
    targetSnapshot.description,
    originalTargetDescription,
  );
  TestValidator.equals(
    "conflicting department name snapshot remains unchanged",
    conflictingSnapshot.name,
    conflictingName,
  );
  TestValidator.equals(
    "conflicting department description snapshot remains unchanged",
    conflictingSnapshot.description,
    conflictingDescription,
  );
  TestValidator.notEquals(
    "target department id is not overwritten by conflicting department id",
    targetSnapshot.id,
    conflictingSnapshot.id,
  );
  TestValidator.notEquals(
    "target department original name is not merged with conflicting name in snapshots",
    targetSnapshot.name,
    conflictingSnapshot.name,
  );
  TestValidator.notEquals(
    "target department original description is not overwritten by conflicting description",
    targetSnapshot.description,
    conflictingSnapshot.description,
  );
}
