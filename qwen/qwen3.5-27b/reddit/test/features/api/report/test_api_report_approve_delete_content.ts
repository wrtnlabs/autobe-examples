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
 * Test the primary workflow where a moderator approves a content report,
 * resulting in the deletion of the reported content.
 *
 * This test validates:
 * 1. Admin creates a community and becomes its owner/moderator
 * 2. Member creates a post in that community
 * 3. Member reports the post
 * 4. Admin approves the report
 * 5. Report status changes to 'approved'
 * 6. Cannot approve an already-approved report
 */
export async function test_api_report_approve_delete_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create community as admin (admin becomes owner/moderator)
  const community =
    await generate_random_reddit_clone_member_communities_create(
      adminConnection,
      {},
    );
  typia.assert(community);
  // 3. Member setup - create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 4. Create a post in the community as member
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        postType: "text",
        content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  // 5. Create a report on the post as member
  const report = await generate_random_reddit_clone_member_reports_create(
    memberConnection,
    {
      body: {
        content_type: "post",
        post_id: post.id,
        reason: "Violates community guidelines - inappropriate content",
      },
    },
  );
  typia.assert(report);
  // Verify report is in pending status
  TestValidator.equals("report initial status", report.status, "pending");
  TestValidator.equals("report content type", report.content_type, "post");
  TestValidator.equals("reported post ID", report.reportedPost?.id, post.id);
  // 6. Admin approves the report
  const updatedReport = await api.functional.redditClone.admin.reports.update(
    adminConnection,
    {
      reportId: report.id,
      body: {
        status: "approved",
      } satisfies IRedditCloneReport.IUpdate,
    },
  );
  typia.assert(updatedReport);
  // 7. Validate report status changed to approved
  TestValidator.equals(
    "report status after approval",
    updatedReport.status,
    "approved",
  );
  // 8. Validate updated_at timestamp exists
  TestValidator.predicate(
    "report updated_at is set",
    updatedReport.updated_at !== undefined,
  );
  // 9. Verify the operation cannot be repeated on already-approved report
  await TestValidator.error(
    "cannot approve already approved report",
    async () => {
      await api.functional.redditClone.admin.reports.update(adminConnection, {
        reportId: report.id,
        body: {
          status: "approved",
        } satisfies IRedditCloneReport.IUpdate,
      });
    },
  );
}
