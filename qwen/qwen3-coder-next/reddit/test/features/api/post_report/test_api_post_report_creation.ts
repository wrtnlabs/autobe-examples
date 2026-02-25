import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneContentComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentComment";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import type { IRedditCloneContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentReport";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorAssignment";
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
import { generate_random_reddit_clone_member_posts_reports_create } from "../../../generate/generate_random_reddit_clone_member_posts_reports_create";
import { prepare_random_reddit_clone_content_post } from "../../../prepare/prepare_random_reddit_clone_content_post";
import { prepare_random_reddit_clone_content_report } from "../../../prepare/prepare_random_reddit_clone_content_report";

export async function test_api_post_report_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.redditClone.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
        displayName: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      } satisfies IRedditCloneMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Generate a community (no admin API available)
  const community = {
    id: typia.random<string & tags.Format<"uuid">>(),
    name: `test-community-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    iconUrl: null,
    subscriberCount: 0,
    createdAt: new Date().toISOString(),
    owner: {
      id: typia.random<string & tags.Format<"uuid">>(),
      username: "communityOwner",
    },
  } satisfies IRedditCloneCommunity.ISummary;
  // 3. Create post
  const post = await api.functional.redditClone.member.posts.create(
    memberConnection,
    {
      body: {
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        community_id: community.id,
      } satisfies IRedditCloneContentPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Report the post
  const reportBody = {
    report_type: "post" as const,
    reason: RandomGenerator.paragraph({ sentences: 1 }),
    post_id: post.id,
  } satisfies IRedditCloneContentReport.ICreate;
  const report = await api.functional.redditClone.member.posts.reports.create(
    memberConnection,
    {
      postId: post.id,
      body: reportBody,
    },
  );
  typia.assert(report);
  // 5. Validate report status
  TestValidator.equals("report status is pending", report.status, "pending");
  // 6. Validate report includes reporter and post information
  TestValidator.equals(
    "reporter id matches member",
    report.reporter.id,
    member.id,
  );
  TestValidator.equals(
    "post id matches reported post",
    report.post?.id,
    post.id,
  );
  TestValidator.equals("report type is post", report.reportType, "post");
  TestValidator.equals(
    "reason matches input",
    report.reason,
    reportBody.reason,
  );
}
