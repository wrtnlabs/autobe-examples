import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSuspension";

/**
 * Test that suspensions from different moderators are correctly attributed.
 *
 * This test creates multiple moderators and verifies that suspension records
 * properly track which moderator imposed each suspension. The test validates
 * that the moderator field in suspension responses contains the correct
 * moderator information based on who was authenticated when each suspension was
 * created.
 *
 * Step-by-step process:
 *
 * 1. Create and authenticate first moderator account
 * 2. Create first contributor suspension while moderator 1 is authenticated
 * 3. Verify moderator 1 attribution for first suspension
 * 4. Create and authenticate second moderator account
 * 5. Create suspensions while moderator 2 is authenticated
 * 6. Verify moderator 2 attribution for suspensions created after authentication
 * 7. Create multiple suspensions on same contributor
 * 8. Verify all suspensions have correct moderator attribution
 */
export async function test_api_contributor_suspension_multiple_moderators(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate first moderator
  const moderator1Email: string = typia.random<string & tags.Format<"email">>();
  const moderator1: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderator1Email,
        password: "SecurePass123!",
        username: RandomGenerator.alphabets(12),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator1);

  const contributor1Id: string = typia.random<string & tags.Format<"uuid">>();

  // Step 2: Create first suspension while moderator 1 is authenticated
  const suspension1: IDiscussionBoardUserSuspension =
    await api.functional.discussionBoard.moderator.contributors.suspend.create(
      connection,
      {
        contributorId: contributor1Id,
        body: {
          suspension_type: "posting_restriction",
          reason: "Violating community guidelines",
          severity_level: "minor",
          duration_days: 3,
        } satisfies IDiscussionBoardUserSuspension.ICreate,
      },
    );
  typia.assert(suspension1);

  // Step 3: Verify moderator 1 attribution for first suspension
  TestValidator.equals(
    "first suspension moderator ID matches moderator 1",
    suspension1.moderator.id,
    moderator1.id,
  );

  TestValidator.equals(
    "first suspension moderator username matches moderator 1",
    suspension1.moderator.username,
    moderator1.username,
  );

  // Step 4: Create and authenticate second moderator
  const moderator2Email: string = typia.random<string & tags.Format<"email">>();
  const moderator2: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderator2Email,
        password: "SecurePass456!",
        username: RandomGenerator.alphabets(12),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator2);

  const contributor2Id: string = typia.random<string & tags.Format<"uuid">>();
  const contributor3Id: string = typia.random<string & tags.Format<"uuid">>();

  // Step 5: Create suspensions while moderator 2 is authenticated
  const suspension2: IDiscussionBoardUserSuspension =
    await api.functional.discussionBoard.moderator.contributors.suspend.create(
      connection,
      {
        contributorId: contributor2Id,
        body: {
          suspension_type: "account_suspension",
          reason: "Repeated violations",
          severity_level: "moderate",
          duration_days: 7,
        } satisfies IDiscussionBoardUserSuspension.ICreate,
      },
    );
  typia.assert(suspension2);

  const suspension3: IDiscussionBoardUserSuspension =
    await api.functional.discussionBoard.moderator.contributors.suspend.create(
      connection,
      {
        contributorId: contributor3Id,
        body: {
          suspension_type: "permanent_ban",
          reason: "Severe violation",
          severity_level: "severe",
        } satisfies IDiscussionBoardUserSuspension.ICreate,
      },
    );
  typia.assert(suspension3);

  // Step 6: Verify moderator 2 attribution for suspensions created after authentication
  TestValidator.equals(
    "second suspension moderator ID matches moderator 2",
    suspension2.moderator.id,
    moderator2.id,
  );

  TestValidator.equals(
    "second suspension moderator username matches moderator 2",
    suspension2.moderator.username,
    moderator2.username,
  );

  TestValidator.equals(
    "third suspension moderator ID matches moderator 2",
    suspension3.moderator.id,
    moderator2.id,
  );

  TestValidator.equals(
    "third suspension moderator username matches moderator 2",
    suspension3.moderator.username,
    moderator2.username,
  );

  // Step 7: Create multiple suspensions on same contributor
  const suspension4: IDiscussionBoardUserSuspension =
    await api.functional.discussionBoard.moderator.contributors.suspend.create(
      connection,
      {
        contributorId: contributor1Id,
        body: {
          suspension_type: "account_suspension",
          reason: "Escalation after posting restriction",
          severity_level: "moderate",
          duration_days: 14,
        } satisfies IDiscussionBoardUserSuspension.ICreate,
      },
    );
  typia.assert(suspension4);

  // Step 8: Verify all suspensions have correct moderator attribution
  TestValidator.notEquals(
    "suspension 1 and 4 have different IDs",
    suspension1.id,
    suspension4.id,
  );

  TestValidator.equals(
    "suspension 1 and 4 target same contributor",
    suspension1.contributor.id,
    suspension4.contributor.id,
  );

  // Suspension 1 was created by moderator 1
  TestValidator.equals(
    "suspension 1 moderator is moderator 1",
    suspension1.moderator.id,
    moderator1.id,
  );

  // Suspension 4 was created by moderator 2 (same contributor, different moderator)
  TestValidator.equals(
    "suspension 4 moderator is moderator 2",
    suspension4.moderator.id,
    moderator2.id,
  );

  // Verify suspension types are correct
  TestValidator.equals(
    "suspension 1 is posting restriction",
    suspension1.suspension_type,
    "posting_restriction",
  );

  TestValidator.equals(
    "suspension 2 is account suspension",
    suspension2.suspension_type,
    "account_suspension",
  );

  TestValidator.equals(
    "suspension 3 is permanent ban",
    suspension3.suspension_type,
    "permanent_ban",
  );

  TestValidator.equals(
    "suspension 4 is account suspension",
    suspension4.suspension_type,
    "account_suspension",
  );

  // Verify suspension severity levels
  TestValidator.equals(
    "suspension 1 severity is minor",
    suspension1.severity_level,
    "minor",
  );

  TestValidator.equals(
    "suspension 2 severity is moderate",
    suspension2.severity_level,
    "moderate",
  );

  TestValidator.equals(
    "suspension 3 severity is severe",
    suspension3.severity_level,
    "severe",
  );

  TestValidator.equals(
    "suspension 4 severity is moderate",
    suspension4.severity_level,
    "moderate",
  );

  // Verify suspension status is active
  TestValidator.equals(
    "suspension 1 status is active",
    suspension1.status,
    "active",
  );

  TestValidator.equals(
    "suspension 2 status is active",
    suspension2.status,
    "active",
  );

  TestValidator.equals(
    "suspension 3 status is active",
    suspension3.status,
    "active",
  );

  TestValidator.equals(
    "suspension 4 status is active",
    suspension4.status,
    "active",
  );

  // Verify moderators are different
  TestValidator.notEquals(
    "moderator 1 and moderator 2 are different",
    moderator1.id,
    moderator2.id,
  );
}
