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

export async function test_api_report_approval_content_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup user and moderator
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IRedditPlatformUser.IJoin,
  });
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IRedditPlatformModerator.IJoin,
  });
  // 2. User creates a comment
  const post = await api.functional.redditPlatform.posts.comments.create(
    userConnection,
    {
      postId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditPlatformComment.ICreate,
    },
  );
  typia.assert(post);
  // 3. User creates a report for the comment
  const report =
    await api.functional.redditPlatform.user.comments.reports.create(
      userConnection,
      {
        commentId: (post as any).id,
        body: {
          reason: "spam",
        } satisfies IRedditPlatformReport.ICreate,
      },
    );
  typia.assert(report);
  // 4. Moderator deletes the comment before approving the report
  await api.functional.redditPlatform.comments.erase(moderatorConnection, {
    commentId: (post as any).id,
  });
  // 5. Moderator attempts to approve the report - content no longer exists
  const result = await api.functional.redditPlatform.moderator.reports.approve(
    moderatorConnection,
    {
      reportId: (report as any).id,
      body: {
        type: "approve",
      } satisfies IRedditPlatformReport.IApproval,
    },
  );
  typia.assert(result);
}