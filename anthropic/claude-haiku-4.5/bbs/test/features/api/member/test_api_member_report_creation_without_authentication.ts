import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

export async function test_api_member_report_creation_without_authentication(
  connection: api.IConnection,
) {
  // Create an unauthenticated connection by removing authorization headers
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Attempt to create a report without authentication
  // This should fail with a 401 Unauthorized error
  await TestValidator.httpError(
    "unauthenticated user cannot create report",
    401,
    async () => {
      return await api.functional.discussionBoard.member.reports.create(
        unauthConnection,
        {
          body: {
            reason: "offensive_language",
            description: "This content contains offensive language",
          } satisfies IDiscussionBoardReport.ICreate,
        },
      );
    },
  );
}
