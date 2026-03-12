import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_discussion_board_administrator_sections_create } from "../../../generate/generate_random_discussion_board_administrator_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test section snapshot not found error handling.
 *
 * This test validates the error handling when attempting to retrieve a section
 * snapshot that does not exist. The test creates a valid section, then attempts
 * to retrieve a non-existent snapshot using a randomly generated UUID, verifying
 * that the API returns a proper 404 Not Found error.
 */
export async function test_api_section_snapshot_not_found_error(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create a section to get a valid sectionId
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {},
    );
  typia.assert(section);
  // 3. Generate a non-existent snapshotId (valid UUID format but doesn't exist)
  const nonExistentSnapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Verify that attempting to retrieve the non-existent snapshot throws 404 error
  await TestValidator.httpError(
    "should return 404 for non-existent snapshot",
    404,
    async () =>
      await api.functional.discussionBoard.sections.snapshots.at(
        adminConnection,
        {
          sectionId: section.id,
          snapshotId: nonExistentSnapshotId,
        },
      ),
  );
}
