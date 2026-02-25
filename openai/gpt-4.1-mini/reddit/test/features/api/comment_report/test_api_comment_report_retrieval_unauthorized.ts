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

export async function test_api_comment_report_retrieval_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Attempt to retrieve a comment report by UUID without authentication
  // Expect: 403 Forbidden error with access denied message
  // We do not perform any moderator join or login to simulate unauthorized access.
  // Generate a random valid UUID for commentReportId
  const commentReportId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to call the endpoint without authorization header
  // Using base connection directly as anonymous
  await TestValidator.httpError(
    "access denied when retrieving comment report without auth",
    403,
    async () => {
      await api.functional.communityPlatform.moderator.commentReports.atCommentReport(
        connection,
        { commentReportId },
      );
    },
  );
}
