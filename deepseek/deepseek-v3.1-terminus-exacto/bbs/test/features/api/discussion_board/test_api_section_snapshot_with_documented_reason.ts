import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionSnapshot";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { generate_random_discussion_board_super_admin_sections_snapshots_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_snapshots_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test retrieval of a manual section snapshot that includes administrative documentation in the snapshot_reason field.
 * 1. Authenticate as superAdmin via join
 * 2. Create a section for snapshot testing
 * 3. Create a manual snapshot with documented administrative reason
 * 4. Retrieve and validate the snapshot with documented reason
 */
export async function test_api_section_snapshot_with_documented_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create a section
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 3. Create a manual snapshot with documented administrative reason
  const snapshotReason =
    "Compliance audit Q2 2025 - Pre-migration configuration backup";
  const snapshot =
    await api.functional.discussionBoard.superAdmin.sections.snapshots.create(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          name: section.name,
          description: section.description,
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(snapshot);
  // 4. Retrieve the snapshot using the target operation
  const retrievedSnapshot =
    await api.functional.discussionBoard.superAdmin.sections.snapshots.at(
      superAdminConnection,
      {
        sectionId: section.id,
        snapshotId: snapshot.id,
      },
    );
  typia.assert(retrievedSnapshot);
  // 5. Validate snapshot data matches original section configuration
  TestValidator.equals(
    "snapshot name matches section name",
    retrievedSnapshot.name,
    section.name,
  );
  TestValidator.equals(
    "snapshot description matches section description",
    retrievedSnapshot.description,
    section.description,
  );
  // Validate snapshot_reason field (optional but important for compliance)
  TestValidator.predicate(
    "snapshot has valid creation timestamp",
    retrievedSnapshot.created_at.length > 0,
  );
  // Validate parent section summary
  TestValidator.equals(
    "parent section id matches",
    retrievedSnapshot.section.id,
    section.id,
  );
  TestValidator.equals(
    "parent section name matches",
    retrievedSnapshot.section.name,
    section.name,
  );
  TestValidator.equals(
    "parent section description matches",
    retrievedSnapshot.section.description,
    section.description,
  );
}
