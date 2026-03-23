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
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_reports_create } from "../../../generate/generate_random_reddit_clone_member_reports_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_report } from "../../../prepare/prepare_random_reddit_clone_report";

/**
 * Test successful comment reporting workflow.
 * 1. Authenticate as member
 * 2. Create a community
 * 3. Create a post in the community
 * 4. Create a comment on the post
 * 5. Report the comment with a valid reason
 * 6. Validate the report response structure and status
 */
export async function test_api_report_comment_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
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
      },
    },
  );
  typia.assert(post);
  // 4. Create a comment on the post
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {},
      },
    );
  typia.assert(comment);
  // 5. Report the comment
  const report = await generate_random_reddit_clone_member_reports_create(
    memberConnection,
    {
      body: {
        content_type: "comment",
        comment_id: comment.id,
        reason: "This comment violates community guidelines",
      },
    },
  );
  typia.assert(report);
  // 6. Validate report status is pending
  TestValidator.equals("report status is pending", report.status, "pending");
  // 7. Validate reporter is the current member
  TestValidator.equals(
    "reporter matches current member",
    report.reporter.id,
    member.id,
  );
  // 8. Validate community is correct
  TestValidator.equals(
    "report community matches",
    report.community.id,
    community.id,
  );
  // 9. Validate reportedComment is present and matches
  const reportedComment = typia.assert(report.reportedComment!);
  TestValidator.equals(
    "reportedComment matches",
    reportedComment.id,
    comment.id,
  );
  // 10. Validate reportedPost is null
  TestValidator.equals("reportedPost is null", report.reportedPost, null);
  // 11. Validate timestamps exist
  TestValidator.predicate(
    "created_at exists",
    report.created_at !== null && report.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    report.updated_at !== null && report.updated_at !== undefined,
  );
}