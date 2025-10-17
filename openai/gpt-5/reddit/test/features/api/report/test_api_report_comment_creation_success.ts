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
 * Create a comment report successfully as an authenticated member.
 *
 * Flow:
 *
 * 1. Join as a member user to obtain authenticated context.
 * 2. Create a community (public, nsfw=false, auto_archive_days>=30).
 * 3. Create a TEXT post in that community.
 * 4. Create a top-level comment under the post.
 * 5. Report the comment with a valid category and non-empty reason.
 *
 * Validations:
 *
 * - Type assertions on every response.
 * - Referential integrity across entities (community → post → comment → report).
 * - Report targets the comment (not the post), reporter equals caller, category
 *   echoes request.
 */
export async function test_api_report_comment_creation_success(
  connection: api.IConnection,
) {
  // 1) Join as member user (SDK attaches token automatically)
  const member = await api.functional.auth.memberUser.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: `user_${RandomGenerator.alphaNumeric(10)}`,
      password: `Pw${RandomGenerator.alphaNumeric(6)}1`, // ensures letters+digits, length >= 8
      terms_accepted_at: new Date().toISOString(),
      privacy_accepted_at: new Date().toISOString(),
      marketing_opt_in: false,
    } satisfies ICommunityPlatformMemberUser.ICreate,
  });
  typia.assert(member);

  // 2) Create a community
  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          name: `c_${RandomGenerator.alphaNumeric(12)}`,
          display_name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          visibility: "public",
          nsfw: false,
          auto_archive_days: 30,
          language: "en",
          region: "KR",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3) Create a TEXT post in the community
  const post =
    await api.functional.communityPlatform.memberUser.communities.posts.create(
      connection,
      {
        communityId: community.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 4 }),
          type: "TEXT",
          body: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 8,
            sentenceMax: 15,
          }),
          nsfw: false,
          spoiler: false,
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(post);
  TestValidator.equals(
    "post belongs to the created community",
    post.community_platform_community_id,
    community.id,
  );

  // 4) Create a top-level comment for the post
  const comment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 8 }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  TestValidator.equals(
    "comment belongs to the created post",
    comment.community_platform_post_id,
    post.id,
  );

  // 5) Report the comment
  const reportInput = {
    category: "harassment/hate" as IEReportCategory,
    reason: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies ICommunityPlatformReport.ICreate;
  const report =
    await api.functional.communityPlatform.memberUser.comments.reports.create(
      connection,
      {
        commentId: comment.id,
        body: reportInput,
      },
    );
  typia.assert(report);

  // Narrow to structural shape for business validations
  const checked = typia.assert<{
    id: string & tags.Format<"uuid">;
    community_platform_user_id: string & tags.Format<"uuid">;
    community_platform_comment_id: string & tags.Format<"uuid">;
    community_platform_post_id?: null | undefined;
    category: IEReportCategory;
    reason: string;
    created_at: string & tags.Format<"date-time">;
    updated_at: string & tags.Format<"date-time">;
  }>(report);

  // Referential and business assertions
  TestValidator.equals(
    "report targets the created comment",
    checked.community_platform_comment_id,
    comment.id,
  );
  TestValidator.equals(
    "reporter is the authenticated member",
    checked.community_platform_user_id,
    member.id,
  );
  TestValidator.equals(
    "post reference is unset for comment report",
    checked.community_platform_post_id ?? null,
    null,
  );
  TestValidator.equals(
    "report category echoes request",
    checked.category,
    reportInput.category,
  );
  await TestValidator.predicate(
    "timestamps are present",
    async () => checked.created_at.length > 0 && checked.updated_at.length > 0,
  );
}
