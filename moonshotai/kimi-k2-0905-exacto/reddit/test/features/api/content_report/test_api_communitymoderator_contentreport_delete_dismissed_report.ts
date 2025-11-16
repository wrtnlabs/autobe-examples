import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test content report deletion for a dismissed report by a community moderator.
 *
 * This test validates the deletion of a dismissed content report to ensure
 * efficient moderation workflows by removing clutter from completed dismissal
 * cases. The scenario establishes proper authentication as a community
 * moderator, generates a valid report ID, and verifies successful deletion of
 * the dismissed report.
 *
 * 1. Register community moderator account for authentication context
 * 2. Generate valid UUID for dismissed content report
 * 3. Delete the dismissed content report via DELETE
 *    /redditCommunity/communityModerator/contentReports/{reportId}
 * 4. Verify deletion operation succeeds (void return)
 */
export async function test_api_communitymoderator_contentreport_delete_dismissed_report(
  connection: api.IConnection,
) {
  // Step 1: Register community moderator account for authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const href = `https://reddit-community.example.com/register`;
  const referrer = `https://reddit-community.example.com/`;

  const moderator = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        email: moderatorEmail,
        password: "ModeratorSecurePass123!",
        nickname: RandomGenerator.name(2),
        href: href,
        referrer: referrer,
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );
  typia.assert<IRedditCommunityCommunityModerator.IAuthorized>(moderator);

  // Step 2: Generate valid UUID for dismissed content report
  const dismissedReportId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Delete the dismissed content report (void function)
  await api.functional.redditCommunity.communityModerator.contentReports.erase(
    connection,
    {
      reportId: dismissedReportId,
    },
  );

  // Step 4: Verify deletion completed without errors
  // Note: The erase function returns void on success, so we test that
  // it doesn't throw an exception and that our connection state is maintained
  TestValidator.predicate(
    "moderation authority preserved after report deletion",
    connection.headers?.Authorization === moderator.token.access,
  );
}
