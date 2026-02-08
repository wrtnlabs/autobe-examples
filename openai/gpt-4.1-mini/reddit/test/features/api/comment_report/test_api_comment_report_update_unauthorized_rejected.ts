import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
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
import { generate_random_community_platform_user_comment_reports_create_comment_report } from "../../../generate/generate_random_community_platform_user_comment_reports_create_comment_report";
import { generate_random_community_platform_user_comments_create } from "../../../generate/generate_random_community_platform_user_comments_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_report } from "../../../prepare/prepare_random_community_platform_comment_report";

export async function test_api_comment_report_update_unauthorized_rejected(
  connection: api.IConnection,
): Promise<void> {
  // This test confirms that unauthorized users cannot update comment reports.
  // 1. Regular User registration and login
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, { body: {} });
  userConnection.headers = { Authorization: userAuth.token.access };
  // 2. Create a comment by the user
  const comment = await generate_random_community_platform_user_comments_create(userConnection, { body: {} });
  typia.assert(comment);
  const commentId = typia.assert<IEntity>(comment).id;
  // 3. Create a comment report by the user for the created comment
  const commentReport = await generate_random_community_platform_user_comment_reports_create_comment_report(userConnection, {
    body: { comment_id: commentId },
  });
  typia.assert(commentReport);
  const commentReportId = typia.assert<IEntity>(commentReport).id;
  // 4. Attempt to update the comment report as a non-moderator user (should fail)
  // Compose update body object with minimal valid IUpdate properties
  // Since ICommunityPlatformCommentReport.IUpdate has no detailed properties from provided info,
  // we use an empty object assuming that the test will fail due to authorization before body validation
  const updateBody: ICommunityPlatformCommentReport.IUpdate = {};
  await TestValidator.httpError(
    "unauthorized update rejected",
    403,
    async () => {
      await api.functional.communityPlatform.moderator.comment_reports.update(
        userConnection,
        {
          commentReportId: commentReportId,
          body: updateBody,
        },
      );
    },
  );
}
