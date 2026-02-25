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

export async function test_api_comment_report_update_by_moderator_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Successful update of a comment report status and description by a registered moderator.
  // 1. Register and authenticate a new moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoinOutput = await authorize_moderator_join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<string>(),
        displayName: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatarUrl: null,
      },
    },
  );
  typia.assert(moderatorJoinOutput);
  moderatorConnection.headers = {
    Authorization: moderatorJoinOutput.token.access,
  };
  // 2. Register and authenticate a new normal user
  const userConnection: api.IConnection = { host: connection.host };
  const userAuthorized = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "secret",
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(userAuthorized);
  userConnection.headers = { Authorization: userAuthorized.token.access };
  // 3. User creates a comment report
  const commentReport =
    await generate_random_community_platform_user_comment_reports_create(
      userConnection,
      {},
    );
  typia.assert(commentReport);
  // 4. The moderator updates the comment report
  const updatedDescription = RandomGenerator.paragraph({ sentences: 3 });
  const updateBody: ICommunityPlatformCommentReport.IUpdate = {
    status: "approved",
    description: updatedDescription,
  };
  const updatedCommentReport =
    await api.functional.communityPlatform.moderator.commentReports.update(
      moderatorConnection,
      {
        commentReportId: commentReport.id,
        body: updateBody,
      },
    );
  typia.assert(updatedCommentReport);
  // 5. Validate updated fields
  TestValidator.equals(
    "status updated",
    updatedCommentReport.status,
    updateBody.status,
  );
  TestValidator.equals(
    "description updated",
    updatedCommentReport.description,
    updateBody.description,
  );
  // 6. Check that timestamps are updated
  TestValidator.predicate(
    "updatedAt timestamp updated",
    new Date(updatedCommentReport.updatedAt).getTime() >
      new Date(commentReport.updatedAt).getTime(),
  );
  // 7. Ensure immutable fields remain unchanged
  TestValidator.equals(
    "id unchanged",
    updatedCommentReport.id,
    commentReport.id,
  );
  TestValidator.equals(
    "createdAt unchanged",
    updatedCommentReport.createdAt,
    commentReport.createdAt,
  );
  TestValidator.equals(
    "deletedAt unchanged",
    updatedCommentReport.deletedAt,
    commentReport.deletedAt,
  );
  TestValidator.equals(
    "comment unchanged",
    updatedCommentReport.comment,
    commentReport.comment,
  );
  TestValidator.equals(
    "reporterUser unchanged",
    updatedCommentReport.reporterUser,
    commentReport.reporterUser,
  );
  TestValidator.equals(
    "reportReason unchanged",
    updatedCommentReport.reportReason,
    commentReport.reportReason,
  );
  // 8. Validate unauthorized update attempt by a user
  await TestValidator.error("unauthorized update rejected", async () => {
    await api.functional.communityPlatform.moderator.commentReports.update(
      userConnection,
      {
        commentReportId: commentReport.id,
        body: {
          status: "dismissed",
        } satisfies ICommunityPlatformCommentReport.IUpdate,
      },
    );
  });
}
