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
 * Test scenario for successful deletion of an existing comment report by an authorized moderator.
 * This test includes moderator registration and authentication as prerequisites.
 * It verifies the system correctly deletes the specified report and handles attempts to delete non-existent reports with 404 error.
 */
export async function test_api_moderator_erase_comment_report_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator registration and authentication
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: null,
    },
  });
  typia.assert(moderator);
  // 2. Prepare a comment report UUID to delete
  // Since no API to create reports provided, use random UUID
  const commentReportId = typia.random<string & tags.Format<"uuid">>();
  // 3. Delete the comment report
  await api.functional.communityPlatform.moderator.commentReports.eraseCommentReport(
    moderatorConnection,
    { commentReportId },
  );
  // 4. Validate the deletion by attempting to delete again - expect 404
  await TestValidator.httpError(
    "deleting non-existent comment report returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.commentReports.eraseCommentReport(
        moderatorConnection,
        { commentReportId },
      );
    },
  );
}
