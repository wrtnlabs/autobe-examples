import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";

export async function test_api_reddit_community_comment_report_deletion_by_moderator(
  connection: api.IConnection,
) {
  // 1. Register a new moderator
  const email = `${RandomGenerator.alphaNumeric(10)}@example.com`;
  const moderator: IRedditCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email,
        password: "1234",
      } satisfies IRedditCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create a reddit community comment report (mocking required IDs)
  // As user session and comment IDs are required but not creatable here, generate random UUIDs
  const commentReportCreate = {
    reason: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    reddit_community_comment_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IRedditCommunityCommentReport.ICreate;
  const commentReport: IRedditCommunityCommentReport =
    await api.functional.redditCommunity.moderator.redditCommunityCommentReports.create(
      connection,
      {
        body: commentReportCreate,
      },
    );
  typia.assert(commentReport);

  // 3. Authenticate moderator again (refresh token scenario)
  await api.functional.auth.moderator.join(connection, {
    body: {
      email,
      password: "1234",
    } satisfies IRedditCommunityModerator.ICreate,
  });

  // 4. Delete the created comment report by ID
  await api.functional.redditCommunity.moderator.redditCommunityCommentReports.erase(
    connection,
    {
      commentReportId: commentReport.id,
    },
  );

  // 5. Attempt to delete again should yield error
  await TestValidator.error(
    "delete non-existing comment report should fail",
    async () => {
      await api.functional.redditCommunity.moderator.redditCommunityCommentReports.erase(
        connection,
        {
          commentReportId: commentReport.id,
        },
      );
    },
  );
}
