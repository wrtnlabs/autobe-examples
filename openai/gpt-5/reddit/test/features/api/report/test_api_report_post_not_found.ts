import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { IEReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEReportCategory";

/**
 * Verify not-found behavior when creating a report for a non-existent post.
 *
 * Steps:
 *
 * 1. Join as a member user to obtain authentication (token is auto-managed by
 *    SDK).
 * 2. Call the post report API with a random UUID for postId that should not exist
 *    and a valid report body (category, reason).
 * 3. Assert that the operation fails (business not-found style error), without
 *    checking specific HTTP status codes.
 */
export async function test_api_report_post_not_found(
  connection: api.IConnection,
) {
  // 1) Join as a member user to authenticate
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(10), // 3–20 chars, letters/digits OK
    password: (() => {
      // Ensure at least one letter and one digit, length >= 8
      return `A1${RandomGenerator.alphaNumeric(8)}`;
    })(),
    terms_accepted_at: new Date().toISOString(),
    privacy_accepted_at: new Date().toISOString(),
    marketing_opt_in: false,
  } satisfies ICommunityPlatformMemberUser.ICreate;
  const authorized = await api.functional.auth.memberUser.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // 2) Attempt to create a report on a non-existent post
  const nonexistentPostId = typia.random<string & tags.Format<"uuid">>();
  const reportBody = {
    category: "spam" as IEReportCategory,
    reason: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformReport.ICreate;

  await TestValidator.error(
    "reporting a non-existent post must fail",
    async () => {
      await api.functional.communityPlatform.memberUser.posts.reports.create(
        connection,
        {
          postId: nonexistentPostId,
          body: reportBody,
        },
      );
    },
  );
}
