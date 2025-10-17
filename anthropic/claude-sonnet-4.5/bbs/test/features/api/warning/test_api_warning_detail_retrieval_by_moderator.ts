import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";
import type { IDiscussionBoardWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardWarning";

/**
 * Test warning detail retrieval endpoint by moderator.
 *
 * This test validates that the GET
 * /discussionBoard/moderator/warnings/{warningId} endpoint is accessible to
 * authenticated moderators and returns properly structured warning data. Due to
 * API limitations (no warning listing or search endpoints), this test uses a
 * randomly generated warningId to test the endpoint structure rather than a
 * complete business workflow.
 *
 * Note: The moderation action creation API does not return the associated
 * warning ID, and there are no available APIs to list or search warnings to
 * obtain a real warningId. Therefore, this test focuses on validating the
 * endpoint's response structure and type compliance rather than a complete
 * end-to-end business scenario.
 *
 * Workflow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Call the warning detail retrieval endpoint with a random warningId
 * 3. Validate the response structure and type compliance
 */
export async function test_api_warning_detail_retrieval_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePass123!@#";

  const moderatorJoinBody = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<30> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: moderatorEmail,
    password: moderatorPassword,
    appointed_by_admin_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderator);

  // Step 2: Retrieve warning details using a random warningId
  // Note: Due to API limitations, we cannot obtain a real warningId from the system
  // The moderation action API does not return warning IDs, and there are no
  // warning listing/search endpoints available
  const randomWarningId = typia.random<string & tags.Format<"uuid">>();

  const warning: IDiscussionBoardWarning =
    await api.functional.discussionBoard.moderator.warnings.at(connection, {
      warningId: randomWarningId,
    });
  typia.assert(warning);

  // Step 3: Validate warning structure
  // The typia.assert above already validates the complete type structure
  // Including all required fields, UUIDs, timestamps, and enum values
  TestValidator.predicate(
    "warning has valid member reference",
    warning.member_id !== null && warning.member_id !== undefined,
  );
  TestValidator.predicate(
    "warning has valid moderation action reference",
    warning.moderation_action_id !== null &&
      warning.moderation_action_id !== undefined,
  );
  TestValidator.predicate(
    "warning has valid timestamps",
    warning.created_at !== null && warning.updated_at !== null,
  );
}
