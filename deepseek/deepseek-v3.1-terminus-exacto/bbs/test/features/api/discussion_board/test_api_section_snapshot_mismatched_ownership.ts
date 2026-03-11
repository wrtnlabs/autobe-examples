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
import { generate_random_discussion_board_admin_sections_snapshots_create } from "../../../generate/generate_random_discussion_board_admin_sections_snapshots_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test error handling when attempting to retrieve a snapshot that does not belong to the specified section.
 *
 * This test validates the ownership validation logic between sections and their snapshots.
 * It creates two different sections, creates a snapshot for the first section, then
 * attempts to retrieve that snapshot using the second section's ID. The system should
 * properly reject the request with an appropriate error response.
 */
export async function test_api_section_snapshot_mismatched_ownership(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create first section
  const section1 = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section1);
  // 3. Create second section
  const section2 = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section2);
  // 4. Create snapshot for the first section
  const snapshot =
    await generate_random_discussion_board_admin_sections_snapshots_create(
      adminConnection,
      {
        params: { sectionId: section1.id },
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(snapshot);
  // 5. Attempt to retrieve the snapshot using the wrong section ID
  await TestValidator.error(
    "should reject snapshot retrieval with mismatched section ownership",
    async () => {
      await api.functional.discussionBoard.admin.sections.snapshots.at(
        adminConnection,
        {
          sectionId: section2.id,
          snapshotId: snapshot.id,
        },
      );
    },
  );
}
