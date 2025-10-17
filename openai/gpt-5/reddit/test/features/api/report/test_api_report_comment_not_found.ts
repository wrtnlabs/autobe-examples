import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { IEReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEReportCategory";

/**
 * Not-found behavior when reporting a non-existent comment.
 *
 * Steps
 *
 * 1. Join as a member user to obtain authentication; the SDK sets Authorization
 *    automatically.
 * 2. Call POST /communityPlatform/memberUser/comments/{commentId}/reports with a
 *    random UUID and a valid body.
 * 3. Expect an error (not-found style). Do not validate specific status codes.
 */
export async function test_api_report_comment_not_found(
  connection: api.IConnection,
) {
  // 1) Join as a member user (authentication)
  const password: string = `${RandomGenerator.alphabets(6)}${RandomGenerator.alphaNumeric(2)}1`;
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(8), // 3-20 chars, letters allowed by pattern
    password,
    terms_accepted_at: new Date().toISOString(),
    privacy_accepted_at: new Date().toISOString(),
    marketing_opt_in: Math.random() < 0.5,
  } satisfies ICommunityPlatformMemberUser.ICreate;

  const me: ICommunityPlatformMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(me);

  // 2) Try to create a report for a non-existent comment (random UUID)
  const nonExistentCommentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3) Expect error (not-found style); do not check specific status codes
  await TestValidator.error(
    "reporting a non-existent comment must fail",
    async () => {
      await api.functional.communityPlatform.memberUser.comments.reports.create(
        connection,
        {
          commentId: nonExistentCommentId,
          body: {
            category: "spam",
            reason: RandomGenerator.paragraph({ sentences: 8 }),
          } satisfies ICommunityPlatformReport.ICreate,
        },
      );
    },
  );
}
