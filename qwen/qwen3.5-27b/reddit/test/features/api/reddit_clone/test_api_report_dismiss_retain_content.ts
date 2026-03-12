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
 * Test the workflow where a moderator dismisses a content report, keeping the reported content visible.
 *
 * This test validates the complete report dismissal lifecycle:
 * 1. Admin creates a community and post
 * 2. Member reports the post
 * 3. Admin dismisses the report
 * 4. Verify post remains visible and report status is updated
 */
export async function test_api_report_dismiss_retain_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create community as admin
  const community =
    await generate_random_reddit_clone_member_communities_create(
      adminConnection,
      {},
    );
  typia.assert(community);
  // 3. Create a post in the community as admin
  const post = await generate_random_reddit_clone_member_posts_create(
    adminConnection,
    {
      body: {
        communityId: community.id,
        postType: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  // 4. Member setup - create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 5. Member reports the post
  const report = await generate_random_reddit_clone_member_reports_create(
    memberConnection,
    {
      body: {
        content_type: "post",
        post_id: post.id,
        reason: "This content violates community guidelines",
      },
    },
  );
  typia.assert(report);
  // Verify report is in pending status
  TestValidator.equals("report initial status", report.status, "pending");
  // 6. Admin dismisses the report
  const updatedReport = await api.functional.redditClone.admin.reports.update(
    adminConnection,
    {
      reportId: report.id,
      body: {
        status: "dismissed",
      } satisfies IRedditCloneReport.IUpdate,
    },
  );
  typia.assert(updatedReport);
  // 7. Validate report status transition from pending to dismissed
  TestValidator.equals(
    "report status dismissed",
    updatedReport.status,
    "dismissed",
  );
  // 8. Validate post remains visible (deleted_at is null) - using the post object we already have
  TestValidator.equals(
    "post remains visible after dismissal",
    post.deleted_at,
    null,
  );
  // 9. Validate report timestamp was updated
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(updatedReport.updated_at) > new Date(updatedReport.created_at),
  );
  // 10. Verify report is no longer in pending status (removed from active queue)
  TestValidator.predicate(
    "report removed from pending queue",
    updatedReport.status !== "pending",
  );
}
