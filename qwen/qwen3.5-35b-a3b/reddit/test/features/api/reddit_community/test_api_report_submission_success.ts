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
import { generate_random_reddit_community_member_posts_reports_create } from "../../../generate/generate_random_reddit_community_member_posts_reports_create";
import { prepare_random_reddit_community_report } from "../../../prepare/prepare_random_reddit_community_report";

export async function test_api_report_submission_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a member to get authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create test post (using random data for testing)
  const postId = typia.random<string & tags.Format<"uuid">>();
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const post: IRedditCommunityPost.ISummary = {
    id: postId,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    post_type: "text",
    text_content: RandomGenerator.content({ paragraphs: 2 }),
    link_url: null,
    vote_score: 0,
    comment_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    author: {
      id: memberAuth.id,
      username: memberAuth.username,
      created_at: memberAuth.created_at,
      updated_at: memberAuth.updated_at,
    },
    community: {
      id: communityId,
      name: RandomGenerator.name(2),
      description: RandomGenerator.paragraph({ sentences: 2 }),
      subscriber_count: 10,
      created_at: new Date().toISOString(),
    } as IRedditCommunityCommunity.ISummary,
  };
  // 3. Submit report for the post
  const reportReason = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });
  const report =
    await api.functional.redditCommunity.member.posts.reports.create(
      memberConnection,
      {
        postId,
        body: {
          reason: reportReason,
        } satisfies IRedditCommunityReport.ICreate,
      },
    );
  typia.assert(report);
  // 4. Validate report response
  TestValidator.equals(
    "reporter matches authenticated user",
    report.reporter.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "reporter username matches",
    report.reporter.username,
    memberAuth.username,
  );
  TestValidator.equals(
    "community matches post community",
    report.community.id,
    communityId,
  );
  TestValidator.equals("target post matches", report.targetPost?.id, postId);
  TestValidator.equals("target comment is null", report.targetComment, null);
  TestValidator.equals("reason matches input", report.reason, reportReason);
  TestValidator.equals("status is pending (0)", report.status_id, 0);
  TestValidator.equals("deleted_at is null", report.deleted_at, null);
  TestValidator.predicate(
    "created_at is valid date",
    () => new Date(report.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date",
    () => new Date(report.updated_at).getTime() > 0,
  );
}
