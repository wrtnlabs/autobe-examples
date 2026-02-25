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
 * Test section snapshot audit trail integrity validation.
 *
 * Validates that section snapshots maintain immutable historical records
 * even when the original section is modified. Creates multiple snapshots
 * at different stages and ensures each preserves the exact state at
 * creation time.
 */
export async function test_api_section_snapshot_audit_trail_integrity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create test section
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 3. Capture initial snapshot
  const snapshot1 =
    await api.functional.discussionBoard.admin.sections.snapshots.create(
      adminConnection,
      {
        sectionId: section.id,
      },
    );
  typia.assert(snapshot1);
  // 4. Modify section
  const updatedSection =
    await api.functional.discussionBoard.admin.sections.update(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          status: "inactive",
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IDiscussionBoardSection.IUpdate,
      },
    );
  typia.assert(updatedSection);
  // 5. Capture second snapshot after modifications
  const snapshot2 =
    await api.functional.discussionBoard.admin.sections.snapshots.create(
      adminConnection,
      {
        sectionId: section.id,
      },
    );
  typia.assert(snapshot2);
  // 6. Validate snapshot integrity
  TestValidator.equals(
    "snapshot1 references correct section",
    snapshot1.discussion_board_section_id,
    section.id,
  );
  TestValidator.equals(
    "snapshot2 references correct section",
    snapshot2.discussion_board_section_id,
    section.id,
  );
  // Verify snapshot1 preserves original section state
  TestValidator.equals(
    "snapshot1 name matches original",
    snapshot1.name,
    section.name,
  );
  TestValidator.equals(
    "snapshot1 description matches original",
    snapshot1.description,
    section.description,
  );
  // Verify snapshot2 captures modified section state
  TestValidator.equals(
    "snapshot2 name matches updated",
    snapshot2.name,
    updatedSection.name,
  );
  TestValidator.equals(
    "snapshot2 description matches updated",
    snapshot2.description,
    updatedSection.description,
  );
  // Verify snapshots are immutable (different from each other)
  TestValidator.notEquals(
    "snapshots have different names",
    snapshot1.name,
    snapshot2.name,
  );
  TestValidator.notEquals(
    "snapshots have different descriptions",
    snapshot1.description,
    snapshot2.description,
  );
  // Validate timestamp integrity
  TestValidator.predicate(
    "snapshot1 created before snapshot2",
    snapshot1.created_at < snapshot2.created_at,
  );
  TestValidator.predicate(
    "snapshot2 created after snapshot1",
    snapshot2.created_at > snapshot1.created_at,
  );
  // Verify snapshot timestamps are reasonable
  TestValidator.predicate(
    "snapshot1 created_at is valid",
    new Date(snapshot1.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "snapshot1 updated_at is valid",
    new Date(snapshot1.updated_at).getTime() > 0,
  );
  TestValidator.predicate(
    "snapshot2 created_at is valid",
    new Date(snapshot2.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "snapshot2 updated_at is valid",
    new Date(snapshot2.updated_at).getTime() > 0,
  );
  // Verify deleted_at is null for active snapshots
  TestValidator.equals(
    "snapshot1 deleted_at is null",
    snapshot1.deleted_at,
    null,
  );
  TestValidator.equals(
    "snapshot2 deleted_at is null",
    snapshot2.deleted_at,
    null,
  );
}
