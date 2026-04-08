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

export async function test_api_admin_report_view_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(admin);
  // 2. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 3. Create a post using member connection
  const post = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        post_type: "text" as const,
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  // 4. Submit a report on the post using member connection
  const report =
    await generate_random_reddit_community_member_posts_reports_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(report);
  // 5. Admin views the report using admin connection
  const retrievedReport = await api.functional.redditCommunity.admin.reports.at(
    adminConnection,
    {
      reportId: report.id,
    },
  );
  typia.assert(retrievedReport);
  // 6. Validate report data
  TestValidator.equals("report id matches", retrievedReport.id, report.id);
  TestValidator.equals(
    "reporter id matches member",
    retrievedReport.reporter.id,
    member.id,
  );
  TestValidator.equals(
    "reporter username matches",
    retrievedReport.reporter.username,
    member.username,
  );
  TestValidator.equals(
    "community id matches post community",
    retrievedReport.community.id,
    post.community.id,
  );
  TestValidator.equals(
    "community name matches",
    retrievedReport.community.name,
    post.community.name,
  );
  TestValidator.equals(
    "target post id matches",
    retrievedReport.targetPost!.id,
    post.id,
  );
  TestValidator.equals(
    "target post title matches",
    retrievedReport.targetPost!.title,
    post.title,
  );
  TestValidator.equals(
    "target comment is null for post report",
    retrievedReport.targetComment,
    null,
  );
  TestValidator.equals(
    "report status is pending",
    retrievedReport.status_id,
    0,
  );
  TestValidator.equals(
    "report reason matches",
    retrievedReport.reason,
    report.reason,
  );
  TestValidator.equals(
    "created_at timestamp preserved",
    retrievedReport.created_at,
    report.created_at,
  );
  TestValidator.equals(
    "updated_at timestamp matches",
    retrievedReport.updated_at,
    report.updated_at,
  );
  TestValidator.equals(
    "deleted_at is null for active report",
    retrievedReport.deleted_at,
    null,
  );
}
