import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";

/**
 * Test creation of new content reports by a guest user (unauthenticated).
 *
 * This test covers submitting reports for posts, comments, and users without
 * requiring authentication. Each report includes a valid guest reporter ID,
 * target resource ID (post, comment, or member), report status ID, categories
 * (spam, abuse, harassment), and optional descriptions.
 *
 * The test verifies that new reports are successfully created and returned with
 * valid UUIDs and timestamps in the response, ensuring proper operation of the
 * reporting API for guests.
 */
export async function test_api_report_creation_by_guest(
  connection: api.IConnection,
) {
  // Report a post content by a guest user
  const postReportBody = {
    reporter_guest_id: typia.random<string & tags.Format<"uuid">>(),
    reported_post_id: typia.random<string & tags.Format<"uuid">>(),
    status_id: typia.random<string & tags.Format<"uuid">>(),
    category: "spam",
    description: "This post contains spam content.",
  } satisfies IRedditCommunityReport.ICreate;

  const postReport = await api.functional.redditCommunity.reports.create(
    connection,
    { body: postReportBody },
  );
  typia.assert(postReport);

  // Report a comment content by a guest user
  const commentReportBody = {
    reporter_guest_id: typia.random<string & tags.Format<"uuid">>(),
    reported_comment_id: typia.random<string & tags.Format<"uuid">>(),
    status_id: typia.random<string & tags.Format<"uuid">>(),
    category: "abuse",
    description: "This comment is abusive and violates guidelines.",
  } satisfies IRedditCommunityReport.ICreate;

  const commentReport = await api.functional.redditCommunity.reports.create(
    connection,
    { body: commentReportBody },
  );
  typia.assert(commentReport);

  // Report a member user by a guest user
  const userReportBody = {
    reporter_guest_id: typia.random<string & tags.Format<"uuid">>(),
    reported_member_id: typia.random<string & tags.Format<"uuid">>(),
    status_id: typia.random<string & tags.Format<"uuid">>(),
    category: "harassment",
    description: "User harassing others in the community.",
  } satisfies IRedditCommunityReport.ICreate;

  const userReport = await api.functional.redditCommunity.reports.create(
    connection,
    { body: userReportBody },
  );
  typia.assert(userReport);
}
