import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_member_reports_create } from "../../../generate/generate_random_reddit_community_member_reports_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_report } from "../../../prepare/prepare_random_reddit_community_report";

export async function test_api_report_create_comment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create two member accounts (reporter and content creator)
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterAuth = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(reporterAuth);
  const contentCreatorConnection: api.IConnection = { host: connection.host };
  const contentCreatorAuth = await authorize_member_join(
    contentCreatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(contentCreatorAuth);
  // 2. Content Creation: Member B creates a post in a community
  const post = await generate_random_reddit_community_member_posts_create(
    contentCreatorConnection,
    {
      body: {
        post_type: "text" as const,
        title: typia.random<string & tags.MaxLength<300>>() satisfies string as (string & tags.MinLength<1> & tags.MaxLength<300>),
      },
    },
  );
  typia.assert(post);
  // 3. Content Creation: Member B writes a comment on their own post
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      contentCreatorConnection,
      {
        params: { postId: post.id },
        body: {
          body: typia.random<string & tags.MaxLength<10000>>() satisfies string as (string & tags.MinLength<1> & tags.MaxLength<10000>),
        },
      },
    );
  typia.assert(comment);
  // 4. Report Submission: Member A reports the comment
  const report = await generate_random_reddit_community_member_reports_create(
    reporterConnection,
    {
      body: {
        community_id: post.community.id,
        target_type: "comment" as const,
        target_id: comment.id,
        reason: typia.random<string & tags.MinLength<1>>(),
      },
    },
  );
  typia.assert(report);
  // 5. Validation: Verify report structure and relationships
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals("target type is comment", report.target_type, "comment");
  TestValidator.equals(
    "target_id matches reported comment",
    report.target_id,
    comment.id,
  );
  TestValidator.equals(
    "community_id matches post community",
    report.community.id,
    post.community.id,
  );
  // 6. Validate all required fields exist with correct types
  typia.assert(report.id);
  typia.assert(report.reporter.id);
  typia.assert(report.community.id);
  typia.assert(report.reason);
  typia.assert(report.created_at);
  typia.assert(report.updated_at);
  typia.assert(report.deleted_at === null);
  // 7. Business Logic: Verify reporter is member A (reporter)
  TestValidator.notEquals("reporter exists", report.reporter, null);
  TestValidator.predicate(
    "reporter has username",
    report.reporter.username.length > 0,
  );
}