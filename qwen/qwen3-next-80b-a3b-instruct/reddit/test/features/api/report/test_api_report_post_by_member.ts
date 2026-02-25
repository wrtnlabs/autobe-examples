import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_member_reports_create } from "../../../generate/generate_random_reddit_community_member_reports_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_report } from "../../../prepare/prepare_random_reddit_community_report";

export async function test_api_report_post_by_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a post to be reported
  const postConnection: api.IConnection = { host: connection.host };
  postConnection.headers = memberConnection.headers; // Carry over auth headers
  // Use a fixed community ID known to exist in test environment
  const communityId = "123e4567-e89b-12d3-a456-426614174000" as const;
  const post = await generate_random_reddit_community_member_posts_create(
    postConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 10,
        }),
        community_id: communityId,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Submit report on the post
  const reportConnection: api.IConnection = { host: connection.host };
  reportConnection.headers = memberConnection.headers; // Carry over auth headers
  const report = await generate_random_reddit_community_member_reports_create(
    reportConnection,
    {
      body: {
        reason: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
        postId: post.id,
      } satisfies IRedditCommunityReport.ICreate,
    },
  );
  typia.assert(report);
  // 4. Validate report
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals(
    "reporter matches member",
    report.reporter.id,
    member.id,
  );
  TestValidator.equals("reported post matches", report.target.id, post.id);
  TestValidator.predicate(
    "reason is within length limit",
    () => report.reason.length >= 1 && report.reason.length <= 1000,
  );
  TestValidator.predicate(
    "target is post summary",
    () => "title" in report.target && "author" in report.target,
  );
}
