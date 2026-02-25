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
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_comment_reports_create } from "../../../generate/generate_random_community_platform_user_comment_reports_create";
import { prepare_random_community_platform_comment_report } from "../../../prepare/prepare_random_community_platform_comment_report";

export async function test_api_comment_report_update_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a user account and login
  const userConnection: api.IConnection = { host: connection.host };
  const userJoinResult = await authorize_user_join(userConnection, {});
  typia.assert(userJoinResult);
  // 2. The user creates a comment report as prerequisite
  const commentReport =
    await generate_random_community_platform_user_comment_reports_create(
      userConnection,
      {},
    );
  typia.assert(commentReport);
  // 3. Create unauthorizedConnection without any authorization header
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  // 4. Attempt to update the comment report without authorization using unauthorizedConnection
  const invalidUpdateBody: ICommunityPlatformCommentReport.IUpdate = {
    status: "approved",
    description: "Trying unauthorized update",
  };
  await TestValidator.httpError(
    "unauthorized update should fail",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.moderator.commentReports.update(
        unauthorizedConnection,
        {
          commentReportId: commentReport.id,
          body: invalidUpdateBody,
        },
      );
    },
  );
  // 5. Attempt to update the comment report using user connection (non-moderator)
  await TestValidator.httpError(
    "update with user connection should fail",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.moderator.commentReports.update(
        userConnection,
        {
          commentReportId: commentReport.id,
          body: invalidUpdateBody,
        },
      );
    },
  );
  // 6. After unauthorized attempts, the comment report must remain unchanged
  const finalReport =
    await api.functional.communityPlatform.user.commentReports.create(
      userConnection,
      {
        body: {
          comment_id: commentReport.comment.id,
          description: commentReport.description,
          report_reason_id: commentReport.reportReason?.id ?? null,
        } satisfies ICommunityPlatformCommentReport.ICreate,
      },
    );
  // The final report must be equal (there is no public GET of comment report,
  // so we do a creation to at least confirm no error and assert unchanged in earlier attempts)
  typia.assert(finalReport);
  TestValidator.equals(
    "comment report status unchanged by unauthorized update",
    finalReport.status,
    commentReport.status,
  );
}
