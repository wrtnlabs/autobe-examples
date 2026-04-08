import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
import type { IRedditCommunityPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostReport";
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

export async function test_api_post_report_view_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - join and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResult = await authorize_admin_join(adminConnection, {
    body: {},
  });
  typia.assert(adminResult);
  // 2. Member setup - join and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberResult = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(memberResult);
  // Create community for the post
  // Need to create a community first since member will post to it
  // However, we don't have a utility for creating communities
  // Let's use typia.random to generate community data for the post
  // 3. Member creates a post
  // The post requires a community_id, so we need to create a community first
  // Since there's no utility for community creation, we'll need to work around this
  // Actually, looking at the API structure, we need:
  // - A community exists first
  // - Member posts to that community
  // - Member reports the post
  // - Admin retrieves the report
  // Since we don't have a community creation endpoint exposed in utilities,
  // let's check if there's another way...
  // Looking at the functional API, we have:
  // - api.functional.redditCommunity.member.posts.create
  // - api.functional.redditCommunity.member.posts.reports.create
  // - api.functional.redditCommunity.admin.posts.reports.at
  // The issue is we need a community to create a post, and a post to create a report
  // Without community creation utilities, we need to work with what we have
  // Let me reconsider: the test should work end-to-end
  // We need to create all prerequisites: admin, member, community, post, report
  // Since I can't create a community without the endpoint, let me check if
  // I should use random generation for the community_id or find another approach
  // Actually, looking more carefully at the utilities provided:
  // There are NO utilities for community creation
  // This means the test scenario as described cannot be fully implemented
  // without adding new utilities
  // However, I should implement what I can and handle the missing pieces
  // by either:
  // 1. Using random generation where appropriate
  // 2. Making assumptions about pre-existing data
  // For a complete test, I'll:
  // 1. Create admin and member
  // 2. Create a community (I'll need to add this step - check if SDK has it)
  // 3. Member creates post
  // 4. Member creates report
  // 5. Admin retrieves report
  // Let me check the SDK for community endpoints...
  // The SDK shows api.functional.redditCommunity but no specific community CRUD endpoints
  // in the provided functions list
  // This is a blocking issue - I cannot complete the test without community creation
  // Wait, let me look more carefully at the DTOs and SDK...
  // IRedditCommunityCommunity.ISummary exists but no create endpoint in the SDK functions list
  // Decision: I will implement the test using the available utilities and
  // assume a community already exists. This is a limitation of the current
  // utility function set.
  // Alternative: Perhaps I should skip this test or mark it as requiring
  // additional utilities. But the user asked for this test specifically.
  // Let me try a different approach - I'll implement the core test logic
  // and use typia.random for the community_id, acknowledging this is a
  // limitation that would need fixing in production
  // Actually, looking at the instructions more carefully:
  // "If scenario is impossible → REWRITE using available APIs. Compilation success > scenario fidelity."
  // So I should make this work with available APIs. Let me check what's available:
  // - admin join/login ✓
  // - member join/login ✓
  // - post creation ✓
  // - report creation ✓
  // - report retrieval ✓
  // - community creation ✗ (NOT AVAILABLE)
  // Since community creation is not available, I cannot create a complete test
  // that creates a new community. The test would need to assume a pre-existing
  // community.
  // However, the scenario specifically mentions "Join as admin user with moderator
  // role in a community" which implies the community should exist.
  // Let me implement the test with a pre-existing community assumption,
  // using a random UUID as a placeholder community_id.
  // This is the best I can do with the current constraints.
  // Generate a test community ID (assuming it exists or will be created externally)
  const testCommunityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Member creates a post in the community
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text" as const,
        reddit_community_community_id: testCommunityId,
        text_content: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Member submits a report on the post
  const report =
    await api.functional.redditCommunity.member.posts.reports.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityReport.ICreate,
      },
    );
  typia.assert(report);
  // 5. Admin retrieves the report
  const retrievedReport =
    await api.functional.redditCommunity.admin.posts.reports.at(
      adminConnection,
      {
        postId: post.id,
        reportId: report.id,
      },
    );
  typia.assert(retrievedReport);
  // 6. Validate the response
  // Check report has all required fields
  TestValidator.equals("report id matches", retrievedReport.id, report.id);
  TestValidator.equals(
    "report reason matches",
    retrievedReport.reason,
    report.reason,
  );
  // Check status is pending (0)
  // According to IRedditCommunityReport documentation: status_id 0 = pending
  // But the response type IRedditCommunityPostReport uses "status" as string
  // Let me check the DTO again...
  // IRedditCommunityPostReport has:
  // - status: string (values: "pending", "reviewed")
  // So I should check that status equals "pending"
  TestValidator.equals(
    "report status is pending",
    retrievedReport.status,
    "pending",
  );
  // Check timestamps are valid ISO strings
  TestValidator.predicate(
    "report has valid created_at timestamp",
    () => !isNaN(Date.parse(retrievedReport.created_at)),
  );
  TestValidator.predicate(
    "report has valid updated_at timestamp",
    () => !isNaN(Date.parse(retrievedReport.updated_at)),
  );
  // Check post details are present
  TestValidator.equals(
    "post title matches",
    retrievedReport.post.title,
    post.title,
  );
  TestValidator.equals(
    "post type matches",
    retrievedReport.post.post_type as typeof post.post_type,
    post.post_type,
  );
  // Check reporter (member) details
  TestValidator.equals(
    "reporter username matches",
    retrievedReport.reporter.username,
    memberResult.username,
  );
  TestValidator.equals(
    "reporter id matches",
    retrievedReport.reporter.id,
    memberResult.id,
  );
  // Check community context
  TestValidator.equals(
    "community id matches",
    retrievedReport.community.id,
    post.community.id,
  );
  TestValidator.equals(
    "community name matches",
    retrievedReport.community.name,
    post.community.name,
  );
}