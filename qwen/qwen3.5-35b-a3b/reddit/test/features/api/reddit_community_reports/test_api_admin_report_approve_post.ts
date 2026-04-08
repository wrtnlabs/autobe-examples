import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_member_posts_reports_create } from "../../../generate/generate_random_reddit_community_member_posts_reports_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_file } from "../../../prepare/prepare_random_reddit_community_post_file";
import { prepare_random_reddit_community_report } from "../../../prepare/prepare_random_reddit_community_report";

export async function test_api_admin_report_approve_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResponse = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(adminResponse);
  // 2. Register member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberResponse);
  // 3. Member creates a post
  const post = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  // 4. Member submits a report for the post
  const report =
    await generate_random_reddit_community_member_posts_reports_create(
      memberConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(report);
  // 5. Verify initial report status is pending
  TestValidator.equals("initial report status pending", report.status_id, 0);
  // 6. Admin approves the report
  const approvedReport =
    await api.functional.redditCommunity.admin.reports.approve(
      adminConnection,
      {
        reportId: report.id,
      },
    );
  typia.assert(approvedReport);
  // 7. Validate reporter and community information preserved
  TestValidator.equals(
    "reporter username preserved",
    approvedReport.reporter.username,
    memberResponse.username,
  );
  TestValidator.equals(
    "community name preserved",
    approvedReport.community.name,
    post.community.name,
  );
  // 8. Validate reason text preserved
  TestValidator.equals(
    "report reason preserved",
    approvedReport.reason,
    report.reason,
  );
  // 9. Validate updated_at changed after approval
  TestValidator.notEquals(
    "updated_at changed after approval",
    report.updated_at,
    approvedReport.updated_at,
  );
}
