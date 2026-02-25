import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import type { IRedditCloneContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentReport";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_posts_report_create } from "../../../generate/generate_random_reddit_clone_member_posts_report_create";
import { prepare_random_reddit_clone_content_post } from "../../../prepare/prepare_random_reddit_clone_content_post";
import { prepare_random_reddit_clone_content_report } from "../../../prepare/prepare_random_reddit_clone_content_report";

export async function test_api_post_report_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register reporter user (to create the report)
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterUser = await api.functional.redditClone.auth.member.join(
    reporterConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
        displayName: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditCloneMember.IJoin,
    },
  );
  typia.assert(reporterUser);
  // 2. Register target post author user (to create the post being reported)
  const authorConnection: api.IConnection = { host: connection.host };
  const authorUser = await api.functional.redditClone.auth.member.join(
    authorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
        displayName: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditCloneMember.IJoin,
    },
  );
  typia.assert(authorUser);
  // 3. Create a community for the post (author must be subscribed)
  // Note: Since communities.create doesn't exist in provided SDK, we'll skip community creation
  // In real implementation, we would create a community first
  // 4. Author creates a post
  const post = await api.functional.redditClone.member.posts.create(
    authorConnection,
    {
      body: {
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content: RandomGenerator.paragraph({ sentences: 3 }),
        community_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditCloneContentPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Reporter reports the post with a valid reason
  await api.functional.redditClone.member.posts.report.create(
    reporterConnection,
    {
      postId: post.id,
      body: {
        report_type: "post",
        reason: "Spam content",
      } satisfies IRedditCloneContentReport.ICreate,
    },
  );
  // 6. Verify the report was created by checking the reporter can see pending reports
  // Note: Since reports.list doesn't exist in provided SDK, we'll just verify the API call succeeded
  // In real implementation, we would fetch and validate the pending reports
}
