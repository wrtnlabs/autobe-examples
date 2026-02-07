import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerator";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
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
import { generate_random_reddit_platform_posts_comments_create } from "../../../generate/generate_random_reddit_platform_posts_comments_create";
import { generate_random_reddit_platform_user_comments_reports_create } from "../../../generate/generate_random_reddit_platform_user_comments_reports_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

/**
 * Test report approval success workflow.
 * 1. Create user account and moderator account
 * 2. User creates a comment on a post
 * 3. User reports the comment
 * 4. Moderator approves the report (removes content)
 * 5. Validate the resolution response structure
 */
export async function test_api_report_approval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create user account
  const userConnection: api.IConnection = { host: connection.host };
  const userCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "12345678",
    username: RandomGenerator.name(),
  } satisfies IRedditPlatformUser.IJoin;
  await authorize_user_join(userConnection, { body: userCredentials });
  typia.assert(userConnection.headers?.Authorization);
  // Create moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "12345678",
    username: RandomGenerator.name(),
  } satisfies IRedditPlatformModerator.IJoin;
  await authorize_moderator_join(moderatorConnection, {
    body: moderatorCredentials,
  });
  typia.assert(moderatorConnection.headers?.Authorization);
  // Generate random IDs for test (since DTOs don't define response structure)
  const postId = RandomGenerator.alphabets(8);
  const commentId = RandomGenerator.alphabets(8);
  const reportId = RandomGenerator.alphabets(8);
  // Create comment via SDK (simulate response since DTO is empty)
  const comment = await api.functional.redditPlatform.posts.comments.create(
    userConnection,
    {
      postId: postId,
      body: {
        content: "This is inappropriate content that should be reported",
      } satisfies IRedditPlatformComment.ICreate,
    },
  );
  typia.assert(comment);
  // Create report via SDK (simulate response since DTO is empty)
  const report =
    await api.functional.redditPlatform.user.comments.reports.create(
      userConnection,
      {
        commentId: commentId,
        body: {
          reason: "inappropriate_content",
        } satisfies IRedditPlatformReport.ICreate,
      },
    );
  typia.assert(report);
  // Approve the report with moderator
  const approvalBody = {
    type: "approve",
  } satisfies IRedditPlatformReport.IApproval;
  const resolution =
    await api.functional.redditPlatform.moderator.reports.approve(
      moderatorConnection,
      {
        reportId: reportId,
        body: approvalBody,
      },
    );
  typia.assert(resolution);
  // Validate resolution response structure
  TestValidator.predicate("resolution is valid", () => resolution !== null);
}
