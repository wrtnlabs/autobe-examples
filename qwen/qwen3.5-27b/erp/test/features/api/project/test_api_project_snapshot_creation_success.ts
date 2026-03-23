import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";

/**
 * Test the primary success path for creating a project snapshot.
 * 1. Register and authenticate as a member user
 * 2. Create a new project with all required fields
 * 3. Create a snapshot of the project
 * 4. Validate snapshot contains denormalized project fields and creator info
 * 5. Verify multiple snapshots can be created for the same project
 */
export async function test_api_project_snapshot_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: undefined,
  });
  typia.assert(memberAuth);
  // 2. Create a project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: undefined,
    },
  );
  typia.assert(project);
  // 3. Create first snapshot
  const snapshot1 =
    await api.functional.hrmPlatform.member.projects.snapshots.createSnapshot(
      memberConnection,
      {
        projectId: project.id,
      },
    );
  typia.assert(snapshot1);
  // 4. Validate snapshot1 contains denormalized project fields
  TestValidator.equals(
    "snapshot name matches project name",
    snapshot1.name,
    project.name,
  );
  TestValidator.equals(
    "snapshot status matches project status",
    snapshot1.status,
    project.status,
  );
  TestValidator.equals(
    "snapshot color_code matches project color_code",
    snapshot1.color_code,
    project.color_code,
  );
  TestValidator.equals(
    "snapshot description matches project description",
    snapshot1.description,
    project.description,
  );
  TestValidator.equals(
    "snapshot budget_hours matches project budget_hours",
    snapshot1.budget_hours,
    project.budget_hours,
  );
  // 5. Validate snapshot1 creator is the authenticated member
  TestValidator.equals(
    "snapshot creator id matches member id",
    snapshot1.creator.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "snapshot creator email matches member email",
    snapshot1.creator.email,
    memberAuth.email,
  );
  // 6. Create second snapshot to verify idempotency
  const snapshot2 =
    await api.functional.hrmPlatform.member.projects.snapshots.createSnapshot(
      memberConnection,
      {
        projectId: project.id,
      },
    );
  typia.assert(snapshot2);
  // 7. Verify both snapshots have different ids
  TestValidator.notEquals(
    "two snapshots have different ids",
    snapshot1.id,
    snapshot2.id,
  );
  // 8. Verify both snapshots contain same project data
  TestValidator.equals(
    "both snapshots have same project name",
    snapshot1.name,
    snapshot2.name,
  );
  TestValidator.equals(
    "both snapshots have same project status",
    snapshot1.status,
    snapshot2.status,
  );
}
