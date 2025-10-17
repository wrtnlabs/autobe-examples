import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { IECommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityPlatformPostType";
import type { IECommunityPlatformPostVisibilityState } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityPlatformPostVisibilityState";
import type { IECommunityVisibility } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityVisibility";
import type { IEReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEReportCategory";

/**
 * Duplicate comment report is rejected for the same user, category, and reason.
 *
 * Steps:
 *
 * 1. Join as a member user (auth token handled by SDK)
 * 2. Create a community
 * 3. Create a TEXT post in that community
 * 4. Create a top-level comment under the post
 * 5. Submit a report for that comment with category "spam" and a reason
 * 6. Submit the same report again (identical category and reason) and expect
 *    rejection
 *
 * Validations:
 *
 * - All successful responses are type-asserted with typia.assert()
 * - The second identical report attempt must throw an error (duplicate)
 */
export async function test_api_report_comment_duplicate_rejected(
  connection: api.IConnection,
) {
  // 1) Join as member user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: `user_${RandomGenerator.alphaNumeric(10)}`,
    password: `A1${RandomGenerator.alphaNumeric(8)}`,
    terms_accepted_at: new Date().toISOString(),
    privacy_accepted_at: new Date().toISOString(),
    marketing_opt_in: true,
  } satisfies ICommunityPlatformMemberUser.ICreate;
  const member: ICommunityPlatformMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, { body: joinBody });
  typia.assert(member);

  // 2) Create a community (minimal valid payload)
  const communityBody = {
    name: `c_${RandomGenerator.alphaNumeric(12)}`,
    visibility: "public",
    nsfw: false,
    auto_archive_days: 30,
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 3) Create a TEXT post in that community
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    type: "TEXT",
    body: RandomGenerator.paragraph({ sentences: 12 }),
  } satisfies ICommunityPlatformPost.ICreate;
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.communities.posts.create(
      connection,
      { communityId: community.id, body: postBody },
    );
  typia.assert(post);

  // 4) Create a top-level comment under the post
  const commentBody = {
    body: RandomGenerator.paragraph({ sentences: 10 }),
  } satisfies ICommunityPlatformComment.ICreate;
  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      { postId: post.id, body: commentBody },
    );
  typia.assert(comment);

  // 5) Report the comment once
  const reportBody = {
    category: "spam",
    reason: RandomGenerator.paragraph({ sentences: 12 }),
  } satisfies ICommunityPlatformReport.ICreate;
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.comments.reports.create(
      connection,
      { commentId: comment.id, body: reportBody },
    );
  typia.assert(report);

  // 6) Attempt duplicate report with identical inputs - expect rejection
  await TestValidator.error(
    "duplicate report should be rejected for same user/category/comment",
    async () => {
      await api.functional.communityPlatform.memberUser.comments.reports.create(
        connection,
        { commentId: comment.id, body: reportBody },
      );
    },
  );
}
