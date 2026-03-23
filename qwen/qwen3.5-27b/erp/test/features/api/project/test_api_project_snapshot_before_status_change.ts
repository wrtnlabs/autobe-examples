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
 * Test creating project snapshots to verify historical state preservation.
 * 1. Authenticate as member user
 * 2. Create first project with status 'active' and snapshot it
 * 3. Create second project with status 'completed' and snapshot it
 * 4. Verify each snapshot correctly captures its project's initial state
 * 5. Confirm snapshots maintain independent historical records
 */
export async function test_api_project_snapshot_before_status_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create first project with status 'active'
  const projectActive =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          status: "active",
        },
      },
    );
  typia.assert(projectActive);
  // 3. Create snapshot of active project
  const snapshotActive =
    await api.functional.hrmPlatform.member.projects.snapshots.createSnapshot(
      memberConnection,
      {
        projectId: projectActive.id,
      },
    );
  typia.assert(snapshotActive);
  // 4. Create second project with status 'completed'
  const projectCompleted =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          status: "completed",
        },
      },
    );
  typia.assert(projectCompleted);
  // 5. Create snapshot of completed project
  const snapshotCompleted =
    await api.functional.hrmPlatform.member.projects.snapshots.createSnapshot(
      memberConnection,
      {
        projectId: projectCompleted.id,
      },
    );
  typia.assert(snapshotCompleted);
  // 6. Verify active project snapshot preserves 'active' status
  TestValidator.equals(
    "active project snapshot status is active",
    snapshotActive.status,
    "active",
  );
  // 7. Verify completed project snapshot captures 'completed' status
  TestValidator.equals(
    "completed project snapshot status is completed",
    snapshotCompleted.status,
    "completed",
  );
  // 8. Confirm both snapshots have different created_at timestamps
  TestValidator.notEquals(
    "snapshots have different timestamps",
    snapshotActive.created_at,
    snapshotCompleted.created_at,
  );
  // 9. Verify snapshots preserve project names independently
  TestValidator.notEquals(
    "snapshots have different project names",
    snapshotActive.name,
    snapshotCompleted.name,
  );
  // 10. Verify both snapshots reference the same creator (current member)
  TestValidator.equals(
    "both snapshots created by same member",
    snapshotActive.creator.id,
    snapshotCompleted.creator.id,
  );
  // 11. Verify snapshot codes match their respective projects
  TestValidator.equals(
    "active snapshot code matches project",
    snapshotActive.code,
    projectActive.id,
  );
  TestValidator.equals(
    "completed snapshot code matches project",
    snapshotCompleted.code,
    projectCompleted.id,
  );
}
