import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

/**
 * Test scenario for deletion failure of a non-existent comment report ID by an authorized moderator.
 *
 * Validates the system behavior when attempting to delete a comment report with a UUID not present in the database.
 * It asserts that the system responds with a 404 Not Found error and an appropriate error message.
 * User authentication is simulated by moderator join operation.
 */
export async function test_api_moderator_erase_comment_report_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as moderator (join)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<string>(),
      displayName: null,
      bio: null,
      avatarUrl: null,
    },
  });
  // Set Authorization header for moderator connection
  moderatorConnection.headers = {
    Authorization: moderatorAuth.token.access,
  };
  // 2. Attempt to delete a comment report with a non-existent UUID
  const nonExistentReportId = typia.random<string & tags.Format<"uuid">>();
  // 3. Expect a 404 Not Found error
  await TestValidator.httpError(
    "delete non-existent comment report should fail with 404",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.commentReports.eraseCommentReport(
        moderatorConnection,
        { commentReportId: nonExistentReportId },
      );
    },
  );
}
