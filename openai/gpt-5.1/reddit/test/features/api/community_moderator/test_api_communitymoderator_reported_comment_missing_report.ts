import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";
import type { ICommunityPlatformReportOfComments } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfComments";

/**
 * Validate behavior when a community moderator requests a reported comment
 * using a non-existent reportId.
 *
 * Business intent
 *
 * - Ensure that the moderator-only endpoint for fetching a reported comment does
 *   not silently succeed or return arbitrary data when given an invalid or
 *   unknown report identifier.
 * - Confirm that, even with a valid authenticated moderator session, the system
 *   responds with an error path when the reportId does not map to any
 *   comment-based report record.
 *
 * High-level steps
 *
 * 1. Register (join) a new community moderator using the public
 *    /auth/communityModerator/join endpoint. The SDK automatically stores the
 *    access token into the connection headers upon success.
 * 2. Generate a random UUID value to use as a fake reportId. Because no setup API
 *    for creating comment reports is available in this test scope, we rely on
 *    the fact that a fresh random UUID is overwhelmingly unlikely to correspond
 *    to a real report row.
 * 3. Call GET /communityPlatform/communityModerator/reports/{reportId}/comment
 *    using
 *    api.functional.communityPlatform.communityModerator.reports.comment.at
 *    with the fake UUID as reportId.
 * 4. Assert that the call fails by using TestValidator.error, without inspecting
 *    the exact HTTP status code or error payload, in order to respect the
 *    abstraction level of the typed SDK.
 */
export async function test_api_communitymoderator_reported_comment_missing_report(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a community moderator
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://community.example.com/moderator/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderator: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: joinBody,
    });
  typia.assert(moderator);

  // 2. Generate a random UUID for a non-existent report
  const missingReportId = typia.random<string & tags.Format<"uuid">>();

  // 3 & 4. Attempt to fetch reported comment for the missing reportId
  await TestValidator.error(
    "non-existent reportId should fail for reported comment fetch",
    async () => {
      await api.functional.communityPlatform.communityModerator.reports.comment.at(
        connection,
        {
          reportId: missingReportId,
        },
      );
    },
  );
}
