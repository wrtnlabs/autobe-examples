import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test that a community moderator can approve a pending content report,
 * resulting in the reported content being deleted.
 */
export async function test_api_report_update_approve_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register community owner (who will be the moderator)
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // 2. Create a community owned by the owner
  const community =
    await generate_random_reddit_clone_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Register post author
  const postAuthorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(postAuthorConnection, {});
  // 4. Create a post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    postAuthorConnection,
    {
      body: {
        communityId: community.id,
      },
    },
  );
  typia.assert(post);
  // 5. Register reporter
  const reporterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(reporterConnection, {});
  // 6. Submit a report against the post
  const report = await generate_random_reddit_clone_member_reports_create(
    reporterConnection,
    {
      body: {
        content_type: "post",
        post_id: post.id,
        reason: "This post violates community guidelines",
      },
    },
  );
  typia.assert(report);
  // Verify initial report status is pending
  TestValidator.equals(
    "initial report status is pending",
    report.status,
    "pending",
  );
  // 7. Approve the report as moderator (using ownerConnection)
  const updatedReport = await api.functional.redditClone.member.reports.update(
    ownerConnection,
    {
      reportId: report.id,
      body: {
        status: "approved",
      } satisfies IRedditCloneReport.IUpdate,
    },
  );
  typia.assert(updatedReport);
  // 8. Validate the report was approved
  TestValidator.equals(
    "report status is approved",
    updatedReport.status,
    "approved",
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    updatedReport.updated_at !== null && updatedReport.updated_at !== undefined,
  );
  // 9. Verify the report cannot be updated again (should return 409 Conflict)
  await TestValidator.httpError(
    "cannot update already approved report",
    409,
    async () =>
      await api.functional.redditClone.member.reports.update(ownerConnection, {
        reportId: report.id,
        body: {
          status: "dismissed",
        } satisfies IRedditCloneReport.IUpdate,
      }),
  );
}
