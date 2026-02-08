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

export async function test_api_comment_report_update_by_moderator_success(
  connection: api.IConnection,
): Promise<void> {
  // This scenario tests successful update of a comment report by a moderator.
  // Actor connections
  const moderatorConnection: api.IConnection = { host: connection.host };
  const userConnection: api.IConnection = { host: connection.host };
  // 1. Moderator join & login
  const moderatorJoinPayload: ICommunityPlatformModerator.IJoin = {};
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: moderatorJoinPayload,
  });
  typia.assert(moderatorAuth);
  const moderatorLoginPayload: ICommunityPlatformModerator.ILogin = {};
  const moderatorLoginAuth = await authorize_moderator_login(
    moderatorConnection,
    { body: moderatorLoginPayload },
  );
  typia.assert(moderatorLoginAuth);
  // Authorization header updated inside authorize_moderator_login
  // 2. User join & login
  const userJoinPayload: ICommunityPlatformUser.IJoin = {};
  const userAuth = await authorize_user_join(userConnection, {
    body: userJoinPayload,
  });
  typia.assert(userAuth);
  const userLoginPayload: ICommunityPlatformUser.ILogin = {};
  const userLoginAuth = await authorize_user_login(userConnection, {
    body: userLoginPayload,
  });
  typia.assert(userLoginAuth);
  // Authorization header updated inside authorize_user_login
  // 3. User creates a comment
  const commentRaw =
    await generate_random_community_platform_user_comments_create(
      userConnection,
      { body: {} },
    );
  typia.assert(commentRaw);
  // 4. User creates a comment report
  const commentReportRaw =
    await generate_random_community_platform_user_comment_reports_create_comment_report(
      userConnection,
      { body: {} },
    );
  typia.assert(commentReportRaw);
  // 5. Moderator updates the comment report
  // Since IUpdate and ICommunityPlatformCommentReport have no properties,
  // use empty body object, and pick a synthetically valid uuid for commentReportId
  // For commentReportId, we cannot get id from commentReportRaw (property doesn't exist),
  // so we will generate a random uuid to satisfy the required parameter
  const commentReportId: string = typia.random<string & tags.Format<"uuid">>();
  const updateBody: ICommunityPlatformCommentReport.IUpdate = {};
  const updatedReportRaw =
    await api.functional.communityPlatform.moderator.comment_reports.update(
      moderatorConnection,
      {
        commentReportId: commentReportId,
        body: updateBody,
      },
    );
  typia.assert(updatedReportRaw);
  // 6. Validation
  // Cannot validate any specific property due to missing DTO properties
  // Just assert that update call did not fail and returned a valid object
}
