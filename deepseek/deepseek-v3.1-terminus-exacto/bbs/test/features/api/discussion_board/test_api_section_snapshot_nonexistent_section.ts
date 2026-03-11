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

/**
 * Test error handling when attempting to retrieve a snapshot for a non-existent section.
 * Authenticate as administrator and attempt to retrieve a snapshot using a valid UUID format
 * for sectionId but with a non-existent section. Validate that the system properly rejects
 * the request with an appropriate error response indicating that the specified section does not exist.
 * This tests the prerequisite validation that sections must exist before retrieving their snapshots.
 */
export async function test_api_section_snapshot_nonexistent_section(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Generate valid UUIDs for non-existent section and snapshot
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve snapshot for non-existent section
  await TestValidator.error(
    "should reject request for non-existent section",
    async () => {
      await api.functional.discussionBoard.admin.sections.snapshots.at(
        adminConnection,
        {
          sectionId,
          snapshotId,
        },
      );
    },
  );
}
