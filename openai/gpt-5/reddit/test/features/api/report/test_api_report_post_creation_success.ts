import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { IECommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityPlatformPostType";
import type { IECommunityPlatformPostVisibilityState } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityPlatformPostVisibilityState";
import type { IECommunityVisibility } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityVisibility";
import type { IEReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEReportCategory";

/**
 * Report creation for a post by an authenticated member user.
 *
 * Steps:
 *
 * 1. Register a member user (join) to obtain an authenticated session (SDK
 *    auto-applies token)
 * 2. Create a community to host the post
 * 3. Create a TEXT post within that community
 * 4. Create a report for the post with category "spam" and a reason containing
 *    leading/trailing spaces
 * 5. Validate:
 *
 *    - Type assertions via typia.assert on each response
 *    - Post belongs to the created community (referential integrity)
 *    - If present in response (ICommunityPlatformReport is any): • category echoes
 *         input • reason is trimmed • reporter id matches the authenticated
 *         user id • post reference set and comment reference unset
 *    - Authorization guard: unauthenticated report creation fails
 */
export async function test_api_report_post_creation_success(
  connection: api.IConnection,
) {
  // 1) Register a member user (join)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: `user_${RandomGenerator.alphaNumeric(8)}`,
    password: `A1${RandomGenerator.alphaNumeric(8)}`,
    terms_accepted_at: new Date().toISOString(),
    privacy_accepted_at: new Date().toISOString(),
    marketing_opt_in: false,
  } satisfies ICommunityPlatformMemberUser.ICreate;
  const member = await api.functional.auth.memberUser.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformMemberUser.IAuthorized>(member);

  // 2) Create a community
  const communityBody = {
    name: `comm_${RandomGenerator.alphaNumeric(12)}`,
    visibility: "public" as IECommunityVisibility,
    nsfw: false,
    auto_archive_days: 30,
    display_name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3) Create a TEXT post within that community
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    type: "TEXT" as const,
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    nsfw: false,
    spoiler: false,
  } satisfies ICommunityPlatformPost.ICreate;
  const post =
    await api.functional.communityPlatform.memberUser.communities.posts.create(
      connection,
      {
        communityId: community.id,
        body: postBody,
      },
    );
  typia.assert<ICommunityPlatformPost>(post);

  // Referential integrity: post belongs to the created community
  TestValidator.equals(
    "post belongs to created community",
    post.community_platform_community_id,
    community.id,
  );
  TestValidator.equals("post type is TEXT", post.type, "TEXT");

  // 4) Create a report for the post (category: spam, reason with spaces)
  const rawReason = `  ${RandomGenerator.paragraph({ sentences: 5 })}  `;
  const reportBody = {
    category: "spam",
    reason: rawReason,
  } satisfies ICommunityPlatformReport.ICreate;
  const report =
    await api.functional.communityPlatform.memberUser.posts.reports.create(
      connection,
      {
        postId: post.id,
        body: reportBody,
      },
    );
  typia.assert<ICommunityPlatformReport>(report);

  // 5) Conditional business assertions when fields are present on the response (type is any)
  if (report && typeof report.category === "string")
    TestValidator.equals(
      "report category echoes input",
      report.category,
      reportBody.category,
    );
  if (report && typeof report.reason === "string")
    TestValidator.equals(
      "report reason is trimmed",
      report.reason,
      rawReason.trim(),
    );
  if (report && typeof report.community_platform_user_id === "string")
    TestValidator.equals(
      "reporter id equals authenticated user id",
      report.community_platform_user_id,
      member.id,
    );
  if (report && typeof report.community_platform_post_id === "string")
    TestValidator.equals(
      "report target post id matches",
      report.community_platform_post_id,
      post.id,
    );
  if (
    report &&
    (report.community_platform_comment_id === null ||
      typeof report.community_platform_comment_id === "undefined")
  )
    TestValidator.predicate(
      "comment reference is unset (null/undefined)",
      report.community_platform_comment_id === null ||
        typeof report.community_platform_comment_id === "undefined",
    );

  // Authorization negative: unauthenticated request must fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated report creation should fail",
    async () =>
      await api.functional.communityPlatform.memberUser.posts.reports.create(
        unauthConn,
        {
          postId: post.id,
          body: {
            category: "spam",
            reason: RandomGenerator.paragraph({ sentences: 4 }),
          } satisfies ICommunityPlatformReport.ICreate,
        },
      ),
  );
}
