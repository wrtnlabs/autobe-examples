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
 * Ensure duplicate reports by the same user on the same post and category are
 * rejected.
 *
 * Workflow
 *
 * 1. Join as a member user (authentication token managed by SDK).
 * 2. Create a community (unique name, valid visibility, nsfw flag, archive window
 *
 * > = 30 days).
 * 3. Create a TEXT post in that community.
 * 4. Submit a report against the post with category "spam" and a non-empty reason.
 * 5. Try submitting the same report again. Expect an error due to deduplication
 *    policy.
 *
 * Validations
 *
 * - Typia.assert on all successful responses (complete type validation).
 * - Post referential integrity: community and author linkage.
 * - Second identical report attempt results in an error (no status/message
 *   assertions).
 */
export async function test_api_report_post_duplicate_rejected(
  connection: api.IConnection,
) {
  // 1) Join as a member user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(12), // 3–20, letters/digits/underscore allowed
    password: `A1${RandomGenerator.alphaNumeric(8)}`, // >=8, includes letter+digit
    terms_accepted_at: new Date().toISOString(),
    privacy_accepted_at: new Date().toISOString(),
    marketing_opt_in: false,
  } satisfies ICommunityPlatformMemberUser.ICreate;
  const me: ICommunityPlatformMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, { body: joinBody });
  typia.assert(me);

  // 2) Create a community
  const communityReq = {
    name: `comm-${RandomGenerator.alphaNumeric(16)}`,
    visibility: "public" as IECommunityVisibility,
    nsfw: false,
    auto_archive_days: 30, // minimum per DTO constraint
    display_name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    language: "en",
    region: "KR",
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityReq },
    );
  typia.assert(community);

  // 3) Create a TEXT post in the community
  const postCreate = {
    title: RandomGenerator.paragraph({ sentences: 4 }),
    type: "TEXT" as const,
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 12,
    }),
    nsfw: false,
    spoiler: false,
  } satisfies ICommunityPlatformPost.ICreate.ITEXT;
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.communities.posts.create(
      connection,
      {
        communityId: community.id,
        body: postCreate,
      },
    );
  typia.assert(post);
  TestValidator.equals(
    "post belongs to created community",
    post.community_platform_community_id,
    community.id,
  );
  TestValidator.equals(
    "post author is the joined member",
    post.community_platform_user_id,
    me.id,
  );

  // 4) Submit the first report (success)
  const reportBody = {
    category: "spam" as IEReportCategory,
    reason: RandomGenerator.paragraph({ sentences: 12 }),
  } satisfies ICommunityPlatformReport.ICreate;
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.posts.reports.create(
      connection,
      { postId: post.id, body: reportBody },
    );
  typia.assert(report);

  // 5) Submit the identical report again (should be rejected)
  await TestValidator.error(
    "duplicate report by same user/category/post is rejected",
    async () => {
      await api.functional.communityPlatform.memberUser.posts.reports.create(
        connection,
        { postId: post.id, body: reportBody },
      );
    },
  );
}
