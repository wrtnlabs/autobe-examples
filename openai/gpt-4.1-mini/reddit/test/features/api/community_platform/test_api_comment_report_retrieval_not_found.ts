import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_comment_report_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Retrieve a comment report with a non-existent commentReportId by a moderator
  // 1. Moderator registers and authenticates
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      displayName: null,
      bio: null,
      avatarUrl: null,
    },
  });
  // Set Authorization header properly
  moderatorConnection.headers ??= {};
  moderatorConnection.headers.Authorization = moderatorAuth.token.access;
  // 2. Generate a non-existent UUID to use as commentReportId
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve the comment report with the non-existent id
  //    Expect an HTTP 404 error (Not Found)
  await TestValidator.httpError(
    "comment report retrieval with non-existent id returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.commentReports.atCommentReport(
        moderatorConnection,
        { commentReportId: nonExistentId },
      );
    },
  );
}
