import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneReport";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_reports_create } from "../../../generate/generate_random_reddit_clone_member_reports_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_report } from "../../../prepare/prepare_random_reddit_clone_report";

/**
 * Test that a moderator can filter reports by the type of content being reported (post or comment).
 *
 * Validates the report filtering functionality for moderators by creating test reports for both posts and comments, then verifying that the report_type filter correctly narrows results to only matching report types.
 *
 * Special attention is given to verifying that the polymorphic content fields (reportedPost vs reportedComment) are correctly populated based on the report type, ensuring that post reports have reportedPost populated with reportedComment as null, and comment reports have reportedComment populated with reportedPost as null.
 *
 * 1. Register and authenticate a moderator account.
 * 2. Register and authenticate a member account.
 * 3. Member creates a post in a community.
 * 4. Member creates a comment on the post.
 * 5. Member submits a report about the post (report_type: 'post').
 * 6. Member submits a report about the comment (report_type: 'comment').
 * 7. Moderator filters reports by report_type 'post' and validates results.
 * 8. Moderator filters reports by report_type 'comment' and validates results.
 * 9. Moderator retrieves all reports without filter and validates both types are included.
 */
export async function test_api_report_filter_by_report_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: "moderator@test.com",
      password: "12345678",
      display_name: "Test Moderator",
      href: "https://test.com/moderator/join",
      referrer: "https://test.com",
    },
  });
  // 2. Setup member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: "member@test.com",
      password: "1234",
      username: "testmember",
      href: "https://test.com/member/join",
      referrer: "https://test.com",
    },
  });
  // 3. Create a post
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {},
  );
  typia.assert(post);
  // 4. Create a comment on the post
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: "This is a test comment that will be reported.",
        },
      },
    );
  typia.assert(comment);
  // 5. Submit a report about the post
  const postReport = await generate_random_reddit_clone_member_reports_create(
    memberConnection,
    {
      body: {
        report_type: "post",
        post_id: post.id,
        reason: "This post violates community guidelines.",
      },
    },
  );
  typia.assert(postReport);
  // 6. Submit a report about the comment
  const commentReport =
    await generate_random_reddit_clone_member_reports_create(memberConnection, {
      body: {
        report_type: "comment",
        comment_id: comment.id,
        reason: "This comment violates community guidelines.",
      },
    });
  typia.assert(commentReport);
  // 7. Filter reports by report_type 'post'
  const postReportsResponse =
    await api.functional.redditClone.moderator.reports.index(
      moderatorConnection,
      {
        body: {
          report_type: "post",
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(postReportsResponse);
  // Verify only post reports are returned
  TestValidator.equals(
    "post filter returns correct count",
    postReportsResponse.data.length,
    1,
  );
  TestValidator.equals(
    "post report has correct type",
    postReportsResponse.data[0].report_type,
    "post",
  );
  TestValidator.predicate(
    "post report has reportedPost populated",
    postReportsResponse.data[0].reportedPost !== null,
  );
  TestValidator.equals(
    "post report has reportedComment as null",
    postReportsResponse.data[0].reportedComment,
    null,
  );
  // 8. Filter reports by report_type 'comment'
  const commentReportsResponse =
    await api.functional.redditClone.moderator.reports.index(
      moderatorConnection,
      {
        body: {
          report_type: "comment",
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(commentReportsResponse);
  // Verify only comment reports are returned
  TestValidator.equals(
    "comment filter returns correct count",
    commentReportsResponse.data.length,
    1,
  );
  TestValidator.equals(
    "comment report has correct type",
    commentReportsResponse.data[0].report_type,
    "comment",
  );
  TestValidator.predicate(
    "comment report has reportedComment populated",
    commentReportsResponse.data[0].reportedComment !== null,
  );
  TestValidator.equals(
    "comment report has reportedPost as null",
    commentReportsResponse.data[0].reportedPost,
    null,
  );
  // 9. Retrieve all reports without filter
  const allReportsResponse =
    await api.functional.redditClone.moderator.reports.index(
      moderatorConnection,
      {
        body: {
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(allReportsResponse);
  // Verify both types are included
  TestValidator.equals(
    "no filter returns all reports",
    allReportsResponse.data.length,
    2,
  );
  const hasPostReport = allReportsResponse.data.some(
    (r) => r.report_type === "post",
  );
  const hasCommentReport = allReportsResponse.data.some(
    (r) => r.report_type === "comment",
  );
  TestValidator.predicate("all reports include post report", hasPostReport);
  TestValidator.predicate(
    "all reports include comment report",
    hasCommentReport,
  );
}
