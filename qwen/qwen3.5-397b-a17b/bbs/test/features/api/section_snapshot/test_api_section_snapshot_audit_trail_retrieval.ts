import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionSnapshot";
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
 * Test section snapshot audit trail retrieval functionality.
 *
 * This test validates the complete audit trail workflow:
 * 1. Administrator registers and authenticates
 * 2. Creates a new discussion board section
 * 3. Updates the section multiple times to generate snapshot history
 * 4. Retrieves the snapshot audit trail
 * 5. Validates snapshot data integrity, ordering, and pagination metadata
 */
export async function test_api_section_snapshot_audit_trail_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create initial section
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 3. Update section multiple times to generate snapshots
  const updateCount = 3;
  const updatedNames: string[] = [];
  for (let i = 0; i < updateCount; i++) {
    const newName = RandomGenerator.paragraph({ sentences: 2 });
    updatedNames.push(newName);
    const updatedSection =
      await api.functional.discussionBoard.admin.sections.update(
        adminConnection,
        {
          sectionId: section.id,
          body: {
            name: newName,
            description: RandomGenerator.content({ paragraphs: 2 }),
          } satisfies IDiscussionBoardSection.IUpdate,
        },
      );
    typia.assert(updatedSection);
  }
  // 4. Retrieve snapshot audit trail
  const snapshotResponse =
    await api.functional.discussionBoard.admin.sections.snapshots.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          page: 1,
          limit: 20,
          sort: "desc",
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(snapshotResponse);
  // 5. Validate pagination metadata
  TestValidator.predicate(
    "has pagination",
    snapshotResponse.pagination !== undefined,
  );
  TestValidator.equals("current page", snapshotResponse.pagination.current, 1);
  TestValidator.equals("limit", snapshotResponse.pagination.limit, 20);
  TestValidator.predicate(
    "has records",
    snapshotResponse.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pages calculated",
    snapshotResponse.pagination.pages >= 1,
  );
  // 6. Validate snapshot data exists
  TestValidator.predicate("has snapshots", snapshotResponse.data.length >= 1);
  // 7. Validate each snapshot structure (typia.assert already validates required fields)
  for (const snapshot of snapshotResponse.data) {
    typia.assert(snapshot);
    // Validate section reference matches parent section
    TestValidator.equals("section id matches", snapshot.section.id, section.id);
    TestValidator.predicate(
      "section has name",
      snapshot.section.name !== undefined,
    );
    TestValidator.predicate(
      "section has description",
      snapshot.section.description !== undefined,
    );
    TestValidator.predicate(
      "section has articles_count",
      snapshot.section.articles_count !== undefined,
    );
  }
  // 8. Validate snapshots are in descending order (newest first)
  if (snapshotResponse.data.length >= 2) {
    for (let i = 0; i < snapshotResponse.data.length - 1; i++) {
      const current = new Date(snapshotResponse.data[i].created_at).getTime();
      const next = new Date(snapshotResponse.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `snapshot ${i} is newer than or equal to ${i + 1}`,
        current >= next,
      );
    }
  }
  // 9. Validate snapshot names are preserved from update history
  const snapshotNames = snapshotResponse.data.map((s) => s.name);
  for (const name of updatedNames) {
    TestValidator.predicate(
      `snapshot contains updated name`,
      snapshotNames.includes(name),
    );
  }
}
