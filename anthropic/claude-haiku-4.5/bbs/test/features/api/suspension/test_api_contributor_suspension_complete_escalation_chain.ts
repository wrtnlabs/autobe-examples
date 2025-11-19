import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSuspension";

/**
 * Test complete escalation workflow through all severity levels for a single
 * contributor.
 *
 * This test validates the progression of suspensions at increasing severity
 * levels:
 *
 * 1. Minor suspension (posting_restriction, 3 days)
 * 2. Moderate suspension (posting_restriction, 7 days) after minor expires
 * 3. Severe suspension (account_suspension, 30 days)
 * 4. Permanent ban (permanent_ban, no expiration)
 *
 * Each suspension is documented with reason and severity level, demonstrating
 * the complete escalation chain enforcement process.
 */
export async function test_api_contributor_suspension_complete_escalation_chain(
  connection: api.IConnection,
) {
  // 1. Create moderator account
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "TestPassword123!",
        username: RandomGenerator.alphabets(8),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.equals(
    "moderator email matches",
    moderator.email,
    moderatorEmail,
  );

  // 2. Generate contributor ID for testing
  const contributorId: string = typia.random<string & tags.Format<"uuid">>();

  // 3. Create minor severity suspension (3 days posting restriction)
  const minorSuspension: IDiscussionBoardUserSuspension =
    await api.functional.discussionBoard.moderator.contributors.suspend.create(
      connection,
      {
        contributorId: contributorId,
        body: {
          suspension_type: "posting_restriction",
          reason: "First violation: Inappropriate content in comments",
          severity_level: "minor",
          duration_days: 3,
        } satisfies IDiscussionBoardUserSuspension.ICreate,
      },
    );
  typia.assert(minorSuspension);
  TestValidator.equals(
    "minor suspension type is posting_restriction",
    minorSuspension.suspension_type,
    "posting_restriction",
  );
  TestValidator.equals(
    "minor severity level",
    minorSuspension.severity_level,
    "minor",
  );
  TestValidator.equals(
    "minor suspension status is active",
    minorSuspension.status,
    "active",
  );
  TestValidator.equals(
    "minor duration days is 3",
    minorSuspension.duration_days,
    3,
  );
  TestValidator.predicate(
    "minor suspension has expiration timestamp",
    minorSuspension.expiration_at !== null &&
      minorSuspension.expiration_at !== undefined,
  );

  // 4. Create moderate severity suspension (7 days posting restriction)
  const moderateSuspension: IDiscussionBoardUserSuspension =
    await api.functional.discussionBoard.moderator.contributors.suspend.create(
      connection,
      {
        contributorId: contributorId,
        body: {
          suspension_type: "posting_restriction",
          reason: "Second violation within 30 days: Spam and off-topic posts",
          severity_level: "moderate",
          duration_days: 7,
        } satisfies IDiscussionBoardUserSuspension.ICreate,
      },
    );
  typia.assert(moderateSuspension);
  TestValidator.equals(
    "moderate suspension type is posting_restriction",
    moderateSuspension.suspension_type,
    "posting_restriction",
  );
  TestValidator.equals(
    "moderate severity level",
    moderateSuspension.severity_level,
    "moderate",
  );
  TestValidator.equals(
    "moderate suspension status is active",
    moderateSuspension.status,
    "active",
  );
  TestValidator.equals(
    "moderate duration days is 7",
    moderateSuspension.duration_days,
    7,
  );
  TestValidator.notEquals(
    "moderate suspension id differs from minor",
    moderateSuspension.id,
    minorSuspension.id,
  );

  // 5. Create severe severity suspension (30 days account suspension)
  const severeSuspension: IDiscussionBoardUserSuspension =
    await api.functional.discussionBoard.moderator.contributors.suspend.create(
      connection,
      {
        contributorId: contributorId,
        body: {
          suspension_type: "account_suspension",
          reason:
            "Third violation: Repeated violations after previous suspensions and escalation warnings",
          severity_level: "severe",
          duration_days: 30,
        } satisfies IDiscussionBoardUserSuspension.ICreate,
      },
    );
  typia.assert(severeSuspension);
  TestValidator.equals(
    "severe suspension type is account_suspension",
    severeSuspension.suspension_type,
    "account_suspension",
  );
  TestValidator.equals(
    "severe severity level",
    severeSuspension.severity_level,
    "severe",
  );
  TestValidator.equals(
    "severe suspension status is active",
    severeSuspension.status,
    "active",
  );
  TestValidator.equals(
    "severe duration days is 30",
    severeSuspension.duration_days,
    30,
  );

  // 6. Create permanent ban (no expiration)
  const permanentBan: IDiscussionBoardUserSuspension =
    await api.functional.discussionBoard.moderator.contributors.suspend.create(
      connection,
      {
        contributorId: contributorId,
        body: {
          suspension_type: "permanent_ban",
          reason:
            "Permanent ban: Continued severe violations including harassment and hate speech after escalation",
          severity_level: "permanent",
          duration_days: null,
        } satisfies IDiscussionBoardUserSuspension.ICreate,
      },
    );
  typia.assert(permanentBan);
  TestValidator.equals(
    "permanent ban type is permanent_ban",
    permanentBan.suspension_type,
    "permanent_ban",
  );
  TestValidator.equals(
    "permanent severity level",
    permanentBan.severity_level,
    "permanent",
  );
  TestValidator.equals(
    "permanent ban status is active",
    permanentBan.status,
    "active",
  );
  TestValidator.predicate(
    "permanent ban has no duration",
    permanentBan.duration_days === null ||
      permanentBan.duration_days === undefined,
  );
  TestValidator.predicate(
    "permanent ban has no expiration timestamp",
    permanentBan.expiration_at === null ||
      permanentBan.expiration_at === undefined,
  );

  // 7. Verify escalation chain progression
  TestValidator.predicate(
    "all suspensions are for same contributor",
    minorSuspension.contributor.id === moderateSuspension.contributor.id &&
      moderateSuspension.contributor.id === severeSuspension.contributor.id &&
      severeSuspension.contributor.id === permanentBan.contributor.id,
  );

  TestValidator.predicate(
    "all suspensions recorded moderator action",
    minorSuspension.moderator.id !== null &&
      minorSuspension.moderator.id !== undefined &&
      moderateSuspension.moderator.id !== null &&
      moderateSuspension.moderator.id !== undefined &&
      severeSuspension.moderator.id !== null &&
      severeSuspension.moderator.id !== undefined &&
      permanentBan.moderator.id !== null &&
      permanentBan.moderator.id !== undefined,
  );

  TestValidator.predicate(
    "escalation chain creates distinct suspension records",
    minorSuspension.id !== moderateSuspension.id &&
      moderateSuspension.id !== severeSuspension.id &&
      severeSuspension.id !== permanentBan.id,
  );
}
