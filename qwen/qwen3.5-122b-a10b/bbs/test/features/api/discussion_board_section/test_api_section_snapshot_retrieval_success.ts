import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test successful retrieval of a section snapshot by an authenticated administrator.
 * 1. Authenticate as admin via join operation
 * 2. Create a new section which automatically generates a snapshot
 * 3. Retrieve the section snapshot using the section ID and snapshot ID
 * 4. Verify the response contains all expected fields
 * 5. Validate that the snapshot data matches the section state at the time of creation
 * 6. Verify the captured_at timestamp reflects when the snapshot was created
 */
export async function test_api_section_snapshot_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create a new section (which automatically generates a snapshot)
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 3. Retrieve the section snapshot
  // Note: Snapshot ID is assumed to match section ID based on automatic generation pattern
  const snapshot =
    await api.functional.discussionBoard.admin.sections.snapshots.at(
      adminConnection,
      {
        sectionId: section.id,
        snapshotId: section.id,
      },
    );
  typia.assert(snapshot);
  // 4. Validate business logic - snapshot data matches section state
  TestValidator.equals(
    "discussion_board_section_id matches created section",
    snapshot.discussion_board_section_id,
    section.id,
  );
  TestValidator.equals(
    "snapshot name matches section name",
    snapshot.name,
    section.name,
  );
  TestValidator.equals(
    "snapshot description matches section description",
    snapshot.description,
    section.description,
  );
  // 5. Validate timestamps exist and are valid
  TestValidator.predicate(
    "section_created_at is valid ISO date-time",
    snapshot.section_created_at !== null &&
      snapshot.section_created_at !== undefined,
  );
  TestValidator.predicate(
    "section_updated_at is valid ISO date-time",
    snapshot.section_updated_at !== null &&
      snapshot.section_updated_at !== undefined,
  );
  TestValidator.predicate(
    "captured_at is valid ISO date-time",
    snapshot.captured_at !== null && snapshot.captured_at !== undefined,
  );
  // 6. Validate captured_at is not before section creation
  TestValidator.predicate(
    "captured_at is not before section creation",
    new Date(snapshot.captured_at ?? "").getTime() >=
      new Date(snapshot.section_created_at ?? "").getTime(),
  );
}
