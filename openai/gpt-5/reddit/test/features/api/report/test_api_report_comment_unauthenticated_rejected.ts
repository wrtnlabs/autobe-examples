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
 * Reject unauthenticated comment report creation.
 *
 * Business context:
 *
 * - Reporting a comment is a protected action; only authenticated users can
 *   submit safety reports. We will set up data using an authenticated flow, but
 *   perform the actual report attempt with an unauthenticated connection to
 *   ensure the server rejects it.
 *
 * Steps:
 *
 * 1. Join as a member user (token is auto-managed by SDK upon success).
 * 2. Create a community.
 * 3. Create a TEXT post in that community.
 * 4. Create a comment under the post and capture its id.
 * 5. Create an unauthenticated connection (clone with headers: {}).
 * 6. Attempt to create a report on the comment with valid body; expect an error.
 *
 * Validations:
 *
 * - Typia.assert() on all successful setup responses.
 * - Linkage checks: post.community_platform_community_id === community.id,
 *   comment.community_platform_post_id === post.id.
 * - Use await TestValidator.error for the unauthenticated report attempt; do not
 *   assert HTTP codes.
 */
export async function test_api_report_comment_unauthenticated_rejected(
  connection: api.IConnection,
) {
  // 1) Join as a member user for setup
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(8),
    password: `A1${RandomGenerator.alphaNumeric(10)}`,
    terms_accepted_at: new Date().toISOString(),
    privacy_accepted_at: new Date().toISOString(),
    marketing_opt_in: false,
  } satisfies ICommunityPlatformMemberUser.ICreate;
  const authorized = await api.functional.auth.memberUser.join(connection, {
    body: memberJoinBody,
  });
  typia.assert(authorized);

  // 2) Create a community
  const communityBody = {
    name: `comm_${RandomGenerator.alphaNumeric(12)}`,
    visibility: "public",
    nsfw: false,
    auto_archive_days: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<30>
    >(),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 3) Create a TEXT post within that community
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 5 }),
    type: "TEXT",
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies ICommunityPlatformPost.ICreate;
  const post =
    await api.functional.communityPlatform.memberUser.communities.posts.create(
      connection,
      {
        communityId: community.id,
        body: postBody,
      },
    );
  typia.assert(post);
  TestValidator.equals(
    "post should reference the created community",
    post.community_platform_community_id,
    community.id,
  );

  // 4) Create a comment under the post
  const commentBody = {
    body: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformComment.ICreate;
  const comment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentBody,
      },
    );
  typia.assert(comment);
  TestValidator.equals(
    "comment should reference the created post",
    comment.community_platform_post_id,
    post.id,
  );

  // 5) Prepare an unauthenticated connection without any headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 6) Attempt to create a report without authentication - must be rejected
  const reportBody = {
    category: "spam",
    reason: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies ICommunityPlatformReport.ICreate;

  await TestValidator.error(
    "unauthenticated comment report should be rejected",
    async () => {
      await api.functional.communityPlatform.memberUser.comments.reports.create(
        unauthConn,
        {
          commentId: comment.id,
          body: reportBody,
        },
      );
    },
  );
}
