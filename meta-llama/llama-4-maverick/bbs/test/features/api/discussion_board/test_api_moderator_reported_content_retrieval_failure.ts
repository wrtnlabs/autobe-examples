import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportedContent";

export async function test_api_moderator_reported_content_retrieval_failure(
  connection: api.IConnection,
) {
  await TestValidator.error(
    "Unauthenticated access to reported content should be denied",
    async () => {
      await api.functional.discussionBoard.moderator.reportedContent.at(
        connection,
        {
          reportedContentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
