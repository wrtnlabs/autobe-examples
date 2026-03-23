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
 * Test successful retrieval of a specific project snapshot.
 * 1. Authenticate as member user
 * 2. Create a project
 * 3. Create a snapshot of the project
 * 4. Retrieve the snapshot by project ID and snapshot ID
 * 5. Verify snapshot contains all denormalized project fields
 * 6. Verify snapshot metadata (created_at, creator)
 */
export async function test_api_project_snapshot_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create a snapshot of the project
  const snapshot =
    await api.functional.hrmPlatform.member.projects.snapshots.createSnapshot(
      memberConnection,
      {
        projectId: project.id,
      },
    );
  typia.assert(snapshot);
  // 4. Retrieve the snapshot by project ID and snapshot ID
  const retrievedSnapshot =
    await api.functional.hrmPlatform.member.projects.snapshots.at(
      memberConnection,
      {
        projectId: project.id,
        snapshotId: snapshot.id,
      },
    );
  typia.assert(retrievedSnapshot);
  // 5. Verify snapshot contains all denormalized project fields
  TestValidator.equals(
    "snapshot code matches",
    retrievedSnapshot.code,
    project.name,
  );
  TestValidator.equals(
    "snapshot name matches",
    retrievedSnapshot.name,
    project.name,
  );
  TestValidator.equals(
    "snapshot description matches",
    retrievedSnapshot.description,
    project.description,
  );
  TestValidator.equals(
    "snapshot status matches",
    retrievedSnapshot.status,
    project.status,
  );
  TestValidator.equals(
    "snapshot color_code matches",
    retrievedSnapshot.color_code,
    project.color_code,
  );
  TestValidator.equals(
    "snapshot budget_hours matches",
    retrievedSnapshot.budget_hours,
    project.budget_hours,
  );
  // 6. Verify snapshot metadata
  TestValidator.predicate(
    "has created_at timestamp",
    !!retrievedSnapshot.created_at,
  );
  TestValidator.predicate("has creator", !!retrievedSnapshot.creator);
  TestValidator.equals(
    "creator email valid",
    typeof retrievedSnapshot.creator.email,
    "string",
  );
}
