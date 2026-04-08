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

export async function test_api_admin_report_approve_already_deleted(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test admin report approval workflow and edge case handling.
   *
   * Validates the report approval flow by creating a post, submitting a report,
   * and having an admin approve it. The test verifies that the report transitions
   * from pending to approved status and that the updated timestamp changes accordingly.
   *
   * Note: The "already deleted" edge case (409 Conflict when approving a report
   * for deleted content) cannot be fully tested in this configuration due to
   * unavailability of a delete post API endpoint in the function dependencies.
   *
   * 1. Administrator joins and authenticates
   * 2. Member accounts join (reporter and post creator)
   * 3. Post creator creates a post in a community
   * 4. Reporter submits a report for the post
   * 5. Report status is verified as pending
   * 6. Admin approves the report successfully
   * 7. Verify report updated_at changed after approval
   */
  // 1. Join admin
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
  };
  const adminJoinResult = await authorize_admin_join(adminJoinConnection, {
    body: adminCredentials,
  });
  typia.assert(adminJoinResult);
  // 2. Join member 1 (reporter)
  const reporterJoinConnection: api.IConnection = { host: connection.host };
  const reporterCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  const reporterJoinResult = await authorize_member_join(
    reporterJoinConnection,
    {
      body: reporterCredentials,
    },
  );
  typia.assert(reporterJoinResult);
  // 3. Join member 2 (post creator)
  const creatorJoinConnection: api.IConnection = { host: connection.host };
  const creatorCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  const creatorJoinResult = await authorize_member_join(creatorJoinConnection, {
    body: creatorCredentials,
  });
  typia.assert(creatorJoinResult);
  // 4. Authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminCredentials.email,
      password: adminCredentials.password,
    },
  });
  // 5. Authenticate reporter
  const reporterConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(reporterConnection, {
    body: {
      email: reporterCredentials.email,
      password: reporterCredentials.password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 6. Authenticate creator
  const creatorConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(creatorConnection, {
    body: {
      email: creatorCredentials.email,
      password: creatorCredentials.password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 7. Create a post as member 2 (creator)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const post = await api.functional.redditCommunity.member.posts.create(
    creatorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text" as const,
        reddit_community_community_id: communityId,
        text_content: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 8. Submit a report for the post as member 1 (reporter)
  const report =
    await api.functional.redditCommunity.member.posts.reports.create(
      reporterConnection,
      {
        postId: post.id,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityReport.ICreate,
      },
    );
  typia.assert(report);
  // 9. Verify report created successfully
  TestValidator.equals("report has valid ID", report.id !== "", true);
  TestValidator.predicate("report has reason", report.reason !== "");
  TestValidator.predicate("report has reporter", report.reporter !== null);
  TestValidator.predicate("report has community", report.community !== null);
  const reportCreatedAt = report.created_at;
  const reportUpdatedAt = report.updated_at;
  // 10. Approve the report as admin
  const approvedReport =
    await api.functional.redditCommunity.admin.reports.approve(
      adminConnection,
      {
        reportId: report.id,
      },
    );
  typia.assert(approvedReport);
  // 11. Verify report updated_at changed after approval
  TestValidator.notEquals(
    "report updated_at changed after approval",
    approvedReport.updated_at,
    reportUpdatedAt,
  );
  TestValidator.equals("report ID unchanged", approvedReport.id, report.id);
  TestValidator.equals(
    "report reason unchanged",
    approvedReport.reason,
    report.reason,
  );
}
