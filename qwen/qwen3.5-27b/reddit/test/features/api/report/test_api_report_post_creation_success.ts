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
 * Test successful post reporting workflow.
 * 1. Authenticate as a member user
 * 2. Create a community
 * 3. Create a post in that community
 * 4. Submit a report for the post with valid reason
 * 5. Verify report is created with status='pending'
 * 6. Verify response contains reporter, community, reportedPost, and reportedComment=null
 */
export async function test_api_report_post_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create a post in the community
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
  // 4. Submit a report for the post
  const report = await generate_random_reddit_clone_member_reports_create(
    memberConnection,
    {
      body: {
        content_type: "post",
        post_id: post.id,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(report);
  // 5. Verify report status is 'pending'
  TestValidator.equals("report status is pending", report.status, "pending");
  // 6. Verify reporter is the authenticated member
  TestValidator.equals(
    "reporter matches authenticated member",
    report.reporter.id,
    authorized.id,
  );
  // 7. Verify community matches
  TestValidator.equals("community matches", report.community.id, community.id);
  // 8. Verify reportedPost contains the post
  TestValidator.equals(
    "reported post matches",
    report.reportedPost?.id,
    post.id,
  );
  // 9. Verify reportedComment is null
  TestValidator.equals(
    "reported comment is null",
    report.reportedComment,
    null,
  );
  // 10. Verify timestamps are set
  TestValidator.predicate(
    "created_at is valid date-time",
    () => !isNaN(new Date(report.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    () => !isNaN(new Date(report.updated_at).getTime()),
  );
}
