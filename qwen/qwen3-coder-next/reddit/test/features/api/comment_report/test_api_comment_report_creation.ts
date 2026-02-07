import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_reddit_platform_posts_comments_create } from "../../../generate/generate_random_reddit_platform_posts_comments_create";
import { generate_random_reddit_platform_user_comments_reports_create } from "../../../generate/generate_random_reddit_platform_user_comments_reports_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

export async function test_api_comment_report_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register two users: reporter and comment author
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporter = await api.functional.redditPlatform.auth.user.join(
    reporterConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        name: RandomGenerator.name(),
      } satisfies IRedditPlatformUser.IJoin,
    },
  );
  typia.assert(reporter);
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await api.functional.redditPlatform.auth.user.join(
    authorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        name: RandomGenerator.name(),
      } satisfies IRedditPlatformUser.IJoin,
    },
  );
  typia.assert(author);
  // 2. Author creates a post
  const post = await api.functional.redditPlatform.posts.comments.create(
    authorConnection,
    {
      postId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditPlatformComment.ICreate,
    },
  );
  typia.assert(post);
  // 3. Reporter creates a comment on the post
  const comment = await api.functional.redditPlatform.posts.comments.create(
    reporterConnection,
    {
      postId: (post as any).id,
      body: {
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditPlatformComment.ICreate,
    },
  );
  typia.assert(comment);
  // 4. Reporter reports the comment
  const report =
    await api.functional.redditPlatform.user.comments.reports.create(
      reporterConnection,
      {
        commentId: (comment as any).id,
        body: {
          reason: "spam",
        } satisfies IRedditPlatformReport.ICreate,
      },
    );
  typia.assert(report);
  // 5. Validate report details
  TestValidator.equals("comment ID matches", (report as any).comment_id, (comment as any).id);
  TestValidator.equals(
    "reporter ID matches reporter",
    (report as any).reporter_id,
    (reporter as any).id,
  );
  TestValidator.equals("status is pending", (report as any).status, "pending");
  TestValidator.predicate(
    "has valid timestamp",
    (report as any).created_at instanceof Date ||
      !isNaN(new Date((report as any).created_at).getTime()),
  );
}