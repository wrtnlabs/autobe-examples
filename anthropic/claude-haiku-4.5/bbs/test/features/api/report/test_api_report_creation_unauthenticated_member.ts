import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Test that report creation requires member authentication and rejects
 * unauthenticated requests.
 *
 * Validates that the API enforces authentication for the report creation
 * endpoint. This scenario ensures only authenticated members can submit
 * reports, preventing anonymous spam of the moderation queue.
 *
 * Test flow:
 *
 * 1. Create an unauthenticated connection (without authorization headers)
 * 2. Attempt to create a report without authentication
 * 3. Verify that the API rejects the request with an authentication error
 */
export async function test_api_report_creation_unauthenticated_member(
  connection: api.IConnection,
) {
  // Step 1: Create an unauthenticated connection without authorization headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 2 & 3: Attempt to create a report without authentication and verify it fails
  await TestValidator.error(
    "report creation should reject unauthenticated requests",
    async () => {
      await api.functional.discussionBoard.member.reports.create(
        unauthenticatedConnection,
        {
          body: {
            reason: typia.random<
              | "offensive_language"
              | "personal_attack"
              | "spam"
              | "off_topic"
              | "copyright_violation"
              | "harassment"
              | "other"
            >(),
            description: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IDiscussionBoardReport.ICreate,
        },
      );
    },
  );
}
