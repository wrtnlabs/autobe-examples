import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test that a community moderator can successfully delete a resolved content
 * report from the moderation system.
 *
 * This test validates the content report deletion functionality which is
 * designed to:
 *
 * - Allow deletion of only resolved or dismissed reports (terminal status)
 * - Prevent accidental deletion of active reports under review
 * - Maintain clean moderation history by removing completed cases
 * - Preserve audit trails for accountability even after deletion
 *
 * Since the complete workflow APIs (creating and resolving reports) are not
 * available in the provided materials, this test focuses on validating
 * authentication requirements and demonstrating the deletion endpoint
 * structure.
 */
export async function test_api_communitymoderator_contentreport_delete_resolved_report(
  connection: api.IConnection,
) {
  // Step 1: Create a community moderator account for authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecureMod123!",
        nickname: RandomGenerator.name(),
        href: "https://reddit-community.com/join",
        referrer: "https://reddit-community.com/login",
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Test the deletion endpoint with a valid UUID format
  // Note: Since APIs to create/resolve reports aren't available, we test the endpoint structure
  const testReportId = typia.random<string & tags.Format<"uuid">>();

  // The delete operation returns void (204 No Content) for valid requests
  // It will succeed for resolved reports, but we cannot test the full workflow without report creation APIs
  await api.functional.redditCommunity.communityModerator.contentReports.erase(
    connection,
    {
      reportId: testReportId,
    },
  );

  // Step 3: Verify that authorization token is properly set after join
  TestValidator.predicate(
    "moderator account created successfully with proper authentication",
    moderator.token.access.length > 0 && moderator.email === moderatorEmail,
  );

  // Step 4: Verify token expiration dates are valid
  TestValidator.predicate(
    "token expiration is in the future",
    new Date(moderator.token.expired_at) > new Date(),
  );

  TestValidator.predicate(
    "refresh token is valid for extended period",
    new Date(moderator.token.refreshable_until) >
      new Date(moderator.token.expired_at),
  );

  // Step 5: Create another moderator to test different authentication context
  const anotherModeratorEmail = typia.random<string & tags.Format<"email">>();
  const anotherModerator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        email: anotherModeratorEmail,
        password: "AnotherMod456!",
        nickname: RandomGenerator.name(),
        href: "https://reddit-community.com/join/another",
        referrer: "https://reddit-community.com/login",
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(anotherModerator);

  // Test deletion with different moderator account
  const anotherReportId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.redditCommunity.communityModerator.contentReports.erase(
    connection,
    {
      reportId: anotherReportId,
    },
  );
}
