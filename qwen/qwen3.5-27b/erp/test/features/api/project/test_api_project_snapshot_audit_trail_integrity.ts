import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformProjectSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformProjectSnapshot";
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
 * Test the immutability and audit trail integrity of project snapshots.
 * This test validates that snapshots preserve historical project state and cannot be modified.
 * 1. Register and authenticate as member
 * 2. Create project with initial state
 * 3. Create first snapshot capturing initial state
 * 4. Update project with different values
 * 5. Create second snapshot capturing updated state
 * 6. Retrieve all snapshots and verify historical accuracy
 * 7. Verify snapshot immutability and creator linking
 */
export async function test_api_project_snapshot_audit_trail_integrity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Create project with initial state
  const initialName = RandomGenerator.name();
  const initialColor = "#FF5733";
  const initialBudget = 100;
  const initialStatus: "active" | "completed" | "archived" = "active";
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: initialName,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: initialStatus,
        color_code: initialColor,
        budget_hours: initialBudget,
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  TestValidator.equals(
    "initial project name matches",
    project.name,
    initialName,
  );
  TestValidator.equals(
    "initial project color matches",
    project.color_code,
    initialColor,
  );
  TestValidator.equals(
    "initial project budget matches",
    project.budget_hours,
    initialBudget,
  );
  TestValidator.equals(
    "initial project status matches",
    project.status,
    initialStatus,
  );
  // 3. Create first snapshot capturing initial state
  const firstSnapshot =
    await api.functional.hrmPlatform.member.projects.snapshots.createSnapshot(
      memberConnection,
      {
        projectId: project.id,
      },
    );
  typia.assert(firstSnapshot);
  TestValidator.equals(
    "first snapshot name matches initial",
    firstSnapshot.name,
    initialName,
  );
  TestValidator.equals(
    "first snapshot color matches initial",
    firstSnapshot.color_code,
    initialColor,
  );
  TestValidator.equals(
    "first snapshot budget matches initial",
    firstSnapshot.budget_hours,
    initialBudget,
  );
  TestValidator.equals(
    "first snapshot status matches initial",
    firstSnapshot.status,
    initialStatus,
  );
  TestValidator.predicate(
    "first snapshot has creator",
    firstSnapshot.creator.id !== undefined,
  );
  // 4. Update project with different values
  const updatedName = RandomGenerator.name();
  const updatedColor = "#33FF57";
  const updatedBudget = 200;
  const updatedStatus: "active" | "completed" | "archived" = "completed";
  const updatedProject =
    await api.functional.hrmPlatform.member.projects.update(memberConnection, {
      projectId: project.id,
      body: {
        name: updatedName,
        description: RandomGenerator.paragraph({ sentences: 5 }),
        status: updatedStatus,
        color_code: updatedColor,
        budget_hours: updatedBudget,
      } satisfies IHrmPlatformProject.IUpdate,
    });
  typia.assert(updatedProject);
  TestValidator.equals(
    "updated project name matches",
    updatedProject.name,
    updatedName,
  );
  TestValidator.equals(
    "updated project color matches",
    updatedProject.color_code,
    updatedColor,
  );
  TestValidator.equals(
    "updated project budget matches",
    updatedProject.budget_hours,
    updatedBudget,
  );
  TestValidator.equals(
    "updated project status matches",
    updatedProject.status,
    updatedStatus,
  );
  // 5. Create second snapshot capturing updated state
  const secondSnapshot =
    await api.functional.hrmPlatform.member.projects.snapshots.createSnapshot(
      memberConnection,
      {
        projectId: project.id,
      },
    );
  typia.assert(secondSnapshot);
  TestValidator.equals(
    "second snapshot name matches updated",
    secondSnapshot.name,
    updatedName,
  );
  TestValidator.equals(
    "second snapshot color matches updated",
    secondSnapshot.color_code,
    updatedColor,
  );
  TestValidator.equals(
    "second snapshot budget matches updated",
    secondSnapshot.budget_hours,
    updatedBudget,
  );
  TestValidator.equals(
    "second snapshot status matches updated",
    secondSnapshot.status,
    updatedStatus,
  );
  TestValidator.predicate(
    "second snapshot has creator",
    secondSnapshot.creator.id !== undefined,
  );
  // 6. Retrieve all snapshots and verify historical accuracy
  const snapshotsPage =
    await api.functional.hrmPlatform.member.projects.snapshots.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          page: 1,
          limit: 10,
          sort: "created_at",
          order: "asc",
        } satisfies IHrmPlatformProjectSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsPage);
  TestValidator.equals("snapshot count matches", snapshotsPage.data.length, 2);
  // Verify first snapshot still contains initial values (not current project values)
  const retrievedFirstSnapshot = snapshotsPage.data[0];
  typia.assert(retrievedFirstSnapshot);
  TestValidator.equals(
    "retrieved first snapshot name is initial (not updated)",
    retrievedFirstSnapshot.name,
    initialName,
  );
  TestValidator.notEquals(
    "first snapshot name differs from current project",
    retrievedFirstSnapshot.name,
    updatedProject.name,
  );
  TestValidator.equals(
    "retrieved first snapshot color is initial",
    retrievedFirstSnapshot.color_code,
    initialColor,
  );
  TestValidator.equals(
    "retrieved first snapshot budget is initial",
    retrievedFirstSnapshot.budget_hours,
    initialBudget,
  );
  TestValidator.equals(
    "retrieved first snapshot status is initial",
    retrievedFirstSnapshot.status,
    initialStatus,
  );
  // Verify second snapshot contains updated values
  const retrievedSecondSnapshot = snapshotsPage.data[1];
  typia.assert(retrievedSecondSnapshot);
  TestValidator.equals(
    "retrieved second snapshot name is updated",
    retrievedSecondSnapshot.name,
    updatedName,
  );
  TestValidator.equals(
    "retrieved second snapshot color is updated",
    retrievedSecondSnapshot.color_code,
    updatedColor,
  );
  TestValidator.equals(
    "retrieved second snapshot budget is updated",
    retrievedSecondSnapshot.budget_hours,
    updatedBudget,
  );
  TestValidator.equals(
    "retrieved second snapshot status is updated",
    retrievedSecondSnapshot.status,
    updatedStatus,
  );
  // 7. Verify snapshot immutability - IDs and timestamps remain unchanged
  TestValidator.equals(
    "first snapshot ID unchanged after retrieval",
    retrievedFirstSnapshot.id,
    firstSnapshot.id,
  );
  TestValidator.equals(
    "second snapshot ID unchanged after retrieval",
    retrievedSecondSnapshot.id,
    secondSnapshot.id,
  );
  TestValidator.equals(
    "first snapshot created_at unchanged",
    retrievedFirstSnapshot.created_at,
    firstSnapshot.created_at,
  );
  TestValidator.equals(
    "second snapshot created_at unchanged",
    retrievedSecondSnapshot.created_at,
    secondSnapshot.created_at,
  );
  // 8. Verify creator linking - both snapshots created by same member
  TestValidator.equals(
    "both snapshots have same creator",
    retrievedFirstSnapshot.creator.id,
    retrievedSecondSnapshot.creator.id,
  );
  TestValidator.predicate(
    "creator email is valid",
    retrievedFirstSnapshot.creator.email !== undefined,
  );
  // Verify chronological order - first snapshot created before second
  TestValidator.predicate(
    "first snapshot created before second",
    new Date(firstSnapshot.created_at).getTime() <
      new Date(secondSnapshot.created_at).getTime(),
  );
}
