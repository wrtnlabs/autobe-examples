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

export async function test_api_section_snapshot_business_logic_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Create initial section
  const section = await api.functional.discussionBoard.admin.sections.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        display_order: typia.random<number & tags.Type<"int32">>(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 3. Create initial snapshot (baseline)
  const snapshot1 =
    await api.functional.discussionBoard.admin.sections.snapshots.create(
      adminConnection,
      { sectionId: section.id },
    );
  typia.assert(snapshot1);
  TestValidator.equals(
    "snapshot1 should match initial section state",
    snapshot1.name,
    section.name,
  );
  TestValidator.equals(
    "snapshot1 description matches",
    snapshot1.description,
    section.description,
  );
  TestValidator.equals(
    "snapshot1 references correct section",
    snapshot1.discussion_board_section_id,
    section.id,
  );
  // 4. Modify section - first update
  const update1Name = RandomGenerator.paragraph({ sentences: 2 });
  const sectionUpdate1 =
    await api.functional.discussionBoard.admin.sections.update(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          name: update1Name,
          description: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies IDiscussionBoardSection.IUpdate,
      },
    );
  typia.assert(sectionUpdate1);
  // Create snapshot after first modification
  const snapshot2 =
    await api.functional.discussionBoard.admin.sections.snapshots.create(
      adminConnection,
      { sectionId: section.id },
    );
  typia.assert(snapshot2);
  TestValidator.equals(
    "snapshot2 should capture first modification",
    snapshot2.name,
    update1Name,
  );
  // 5. Modify section - second update with status change
  const update2Status = "inactive" as const;
  const sectionUpdate2 =
    await api.functional.discussionBoard.admin.sections.update(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          status: update2Status,
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IDiscussionBoardSection.IUpdate,
      },
    );
  typia.assert(sectionUpdate2);
  // Create snapshot after second modification
  const snapshot3 =
    await api.functional.discussionBoard.admin.sections.snapshots.create(
      adminConnection,
      { sectionId: section.id },
    );
  typia.assert(snapshot3);
  // 6. Test snapshot retrieval accuracy
  // Retrieve snapshot1 and verify it still has initial state
  const retrievedSnapshot1 =
    await api.functional.discussionBoard.admin.sections.snapshots.at(
      adminConnection,
      {
        sectionId: section.id,
        snapshotId: snapshot1.id,
      },
    );
  typia.assert(retrievedSnapshot1);
  TestValidator.equals(
    "retrieved snapshot1 matches original snapshot1",
    retrievedSnapshot1.name,
    snapshot1.name,
  );
  // Retrieve snapshot2 and verify it has first modification state
  const retrievedSnapshot2 =
    await api.functional.discussionBoard.admin.sections.snapshots.at(
      adminConnection,
      {
        sectionId: section.id,
        snapshotId: snapshot2.id,
      },
    );
  typia.assert(retrievedSnapshot2);
  TestValidator.equals(
    "retrieved snapshot2 matches snapshot2 name",
    retrievedSnapshot2.name,
    snapshot2.name,
  );
  // 7. Test non-existent snapshot retrieval (should error)
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "retrieving non-existent snapshot should error",
    async () =>
      await api.functional.discussionBoard.admin.sections.snapshots.at(
        adminConnection,
        {
          sectionId: section.id,
          snapshotId: nonExistentId,
        },
      ),
  );
  // 8. Delete section
  await api.functional.discussionBoard.admin.sections.erase(adminConnection, {
    sectionId: section.id,
  });
  // 9. Verify snapshots are still accessible after section deletion (audit trail)
  const snapshotAfterDeletion =
    await api.functional.discussionBoard.admin.sections.snapshots.at(
      adminConnection,
      {
        sectionId: section.id,
        snapshotId: snapshot1.id,
      },
    );
  typia.assert(snapshotAfterDeletion);
  TestValidator.equals(
    "snapshots remain accessible after section deletion",
    snapshotAfterDeletion.name,
    snapshot1.name,
  );
  // 10. Test retrieval with non-existent section ID but existing snapshot ID (should error)
  const anotherNonExistentSectionId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "retrieving snapshot with non-existent section ID should error",
    async () =>
      await api.functional.discussionBoard.admin.sections.snapshots.at(
        adminConnection,
        {
          sectionId: anotherNonExistentSectionId,
          snapshotId: snapshot1.id,
        },
      ),
  );
  // 11. Validate historical state accuracy
  TestValidator.notEquals(
    "snapshot1 and snapshot2 should have different states",
    snapshot1.name,
    snapshot2.name,
  );
  TestValidator.notEquals(
    "snapshot2 and snapshot3 should have different states",
    snapshot2.name,
    snapshot3.name,
  );
  TestValidator.equals(
    "snapshot1 references original section",
    snapshot1.discussion_board_section_id,
    section.id,
  );
  TestValidator.equals(
    "snapshot2 references original section",
    snapshot2.discussion_board_section_id,
    section.id,
  );
  TestValidator.equals(
    "snapshot3 references original section",
    snapshot3.discussion_board_section_id,
    section.id,
  );
}
