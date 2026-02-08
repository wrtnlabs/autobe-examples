import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_comment_report_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Moderator account creation, authentication, successful comment report retrieval,
  // unauthorized access and 404 not found testing.
  // 1. Moderator join and get authorized connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  const modAuth = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  moderatorConnection.headers = {
    Authorization: `Bearer ${modAuth.token.access}`,
  };
  // 2. Use a valid UUID commentReportId for retrieval test
  // Generate a random UUID (format string) for testing
  const validCommentReportId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve comment report detail by authorized moderator
  const commentReport =
    await api.functional.communityPlatform.moderator.comment_reports.at(
      moderatorConnection,
      {
        commentReportId: validCommentReportId,
      },
    );
  typia.assert(commentReport);
  // 4. Unauthorized access test: create base connection without auth
  const unauthConnection: api.IConnection = { host: connection.host };
  // 5. Test unauthorized access gets 403 forbidden error
  await TestValidator.httpError(
    "unauthorized access forbidden",
    403,
    async () =>
      await api.functional.communityPlatform.moderator.comment_reports.at(
        unauthConnection,
        {
          commentReportId: validCommentReportId,
        },
      ),
  );
  // 6. Test 404 not found error with random unknown UUID
  const unknownCommentReportId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "not found for unknown commentReportId",
    404,
    async () =>
      await api.functional.communityPlatform.moderator.comment_reports.at(
        moderatorConnection,
        {
          commentReportId: unknownCommentReportId,
        },
      ),
  );
}
