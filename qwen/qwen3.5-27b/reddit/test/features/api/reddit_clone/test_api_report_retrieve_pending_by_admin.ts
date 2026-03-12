import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAdmin";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
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
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_reports_create } from "../../../generate/generate_random_reddit_clone_member_reports_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_report } from "../../../prepare/prepare_random_reddit_clone_report";

/**
 * Test that an authenticated admin can retrieve a pending content report.
 * Validates the complete report data structure including reporter, community,
 * and reported post information.
 */
export async function test_api_report_retrieve_pending_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Member1 (post creator) authentication
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {});
  // 3. Member2 (reporter) authentication
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {});
  // 4. Member1 creates a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      member1Connection,
      {},
    );
  typia.assert(community);
  // 5. Member1 creates a post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    member1Connection,
    {
      body: {
        communityId: community.id,
      },
    },
  );
  typia.assert(post);
  // 6. Member2 reports the post
  const report = await generate_random_reddit_clone_member_reports_create(
    member2Connection,
    {
      body: {
        content_type: "post",
        post_id: post.id,
        reason: "This content violates community guidelines",
      },
    },
  );
  typia.assert(report);
  // 7. Admin retrieves the report
  const retrievedReport = await api.functional.redditClone.admin.reports.at(
    adminConnection,
    {
      reportId: report.id,
    },
  );
  typia.assert(retrievedReport);
  // 8. Validate report data structure
  TestValidator.equals("report ID matches", retrievedReport.id, report.id);
  TestValidator.equals(
    "content type is post",
    retrievedReport.content_type,
    "post",
  );
  TestValidator.equals("status is pending", retrievedReport.status, "pending");
  TestValidator.predicate("has reason", retrievedReport.reason.length > 0);
  // Validate reporter information
  TestValidator.equals(
    "reporter ID matches member2",
    retrievedReport.reporter.id,
    member2Auth.id,
  );
  TestValidator.predicate(
    "reporter has username",
    retrievedReport.reporter.username.length > 0,
  );
  TestValidator.predicate(
    "reporter has display name",
    retrievedReport.reporter.display_name.length > 0,
  );
  // Validate community information
  TestValidator.equals(
    "community ID matches",
    retrievedReport.community.id,
    community.id,
  );
  TestValidator.predicate(
    "community has name",
    retrievedReport.community.name.length > 0,
  );
  // Validate reported post information
  TestValidator.equals(
    "reported post ID matches",
    retrievedReport.reportedPost?.id,
    post.id,
  );
  TestValidator.predicate(
    "reported post has title",
    (retrievedReport.reportedPost?.title?.length ?? 0) > 0,
  );
  TestValidator.equals(
    "reported comment is null",
    retrievedReport.reportedComment,
    null,
  );
  // Validate timestamps exist
  TestValidator.predicate(
    "has created_at",
    retrievedReport.created_at.length > 0,
  );
  TestValidator.predicate(
    "has updated_at",
    retrievedReport.updated_at.length > 0,
  );
}
