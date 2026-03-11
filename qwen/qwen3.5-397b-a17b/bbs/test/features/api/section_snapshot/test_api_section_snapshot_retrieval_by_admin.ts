import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
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
 * Test administrator retrieval of section snapshot by ID.
 *
 * Workflow:
 * 1. Administrator authenticates via join
 * 2. Creates initial section (generates first snapshot)
 * 3. Updates section to create additional snapshot
 * 4. Validates section update was successful
 * 5. Retrieves snapshot using sectionId and snapshotId path parameters
 * 6. Validates snapshot structure via typia.assert()
 *
 * Note: Since the available API functions only provide snapshot retrieval by ID
 * (no list endpoint), this test validates the endpoint structure and response format.
 * In a complete test suite, snapshotId would be obtained from a list snapshots endpoint.
 */
export async function test_api_section_snapshot_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
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
  typia.assert(adminAuth);
  // 2. Create initial section (generates first snapshot)
  const initialSection =
    await generate_random_discussion_board_admin_sections_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    );
  typia.assert(initialSection);
  // 3. Update section to create additional snapshot
  const updatedSection =
    await api.functional.discussionBoard.admin.sections.update(
      adminConnection,
      {
        sectionId: initialSection.id,
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IDiscussionBoardSection.IUpdate,
      },
    );
  typia.assert(updatedSection);
  // 4. Validate section was updated (business logic validation)
  TestValidator.notEquals(
    "section name changed",
    initialSection.name,
    updatedSection.name,
  );
  TestValidator.notEquals(
    "section description changed",
    initialSection.description,
    updatedSection.description,
  );
  // 5. Retrieve snapshot
  // Note: In production, snapshotId would come from list snapshots endpoint.
  // This test validates the endpoint structure and response format.
  const snapshot =
    await api.functional.discussionBoard.admin.sections.snapshots.at(
      adminConnection,
      {
        sectionId: initialSection.id,
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(snapshot);
  // 6. Validate snapshot business logic (not type - typia.assert handles that)
  TestValidator.equals(
    "snapshot section reference matches",
    snapshot.section.id,
    initialSection.id,
  );
  TestValidator.predicate(
    "snapshot section has valid name",
    snapshot.section.name.length > 0,
  );
  TestValidator.predicate(
    "snapshot section has articles count",
    snapshot.section.articles_count >= 0,
  );
}
