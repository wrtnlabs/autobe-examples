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
 * Ensure unauthenticated users cannot create reports for posts.
 *
 * Steps:
 *
 * 1. Register a member user (to acquire auth context for data setup).
 * 2. Create a community with required fields.
 * 3. Create a TEXT post in the created community.
 * 4. Create an unauthenticated connection (empty headers) derived from the
 *    original.
 * 5. Attempt to create a report for the post without Authorization; expect an
 *    error.
 *
 * Notes:
 *
 * - Request bodies strictly use `satisfies {Dto}` for type-safety.
 * - All successful responses are validated using typia.assert().
 * - Error validation uses TestValidator.error with async callback and no status
 *   checks.
 */
export async function test_api_report_post_unauthenticated_rejected(
  connection: api.IConnection,
) {
  // 1) Join as a member user to set up data
  const member = await api.functional.auth.memberUser.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      // Ensure password contains both letters and digits and length >= 8
      password: `${RandomGenerator.alphaNumeric(6)}A1`,
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
          name: `comm_${RandomGenerator.alphaNumeric(10)}`,
          visibility: "public",
          nsfw: false,
          auto_archive_days: 30,
          display_name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          language: "en",
          region: "US",
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
          title: RandomGenerator.paragraph({ sentences: 3 }),
          type: "TEXT",
          body: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 8,
            sentenceMax: 14,
          }),
          nsfw: false,
          spoiler: false,
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(post);

  // 4) Build an unauthenticated connection (do NOT touch original headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 5) Try to create a report without auth → must be rejected
  await TestValidator.error(
    "unauthenticated post report creation should be rejected",
    async () => {
      await api.functional.communityPlatform.memberUser.posts.reports.create(
        unauthConn,
        {
          postId: post.id,
          body: {
            category: "spam",
            reason: RandomGenerator.paragraph({ sentences: 5 }),
          } satisfies ICommunityPlatformReport.ICreate,
        },
      );
    },
  );
}
