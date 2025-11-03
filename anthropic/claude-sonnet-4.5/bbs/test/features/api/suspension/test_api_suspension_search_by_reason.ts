import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSuspension";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserSuspension";

/**
 * Test filtering suspensions by violation reason categories.
 *
 * This test validates the suspension search functionality's ability to filter
 * suspensions by specific violation reason categories. It creates multiple
 * suspensions with different violation types (spam, harassment, hate speech,
 * misinformation) and verifies that the search API correctly filters results
 * based on the requested reason category.
 *
 * Test Steps:
 *
 * 1. Create and authenticate a moderator account
 * 2. Create multiple member accounts to be suspended
 * 3. Create suspensions with different violation reasons
 * 4. Search for suspensions filtered by specific reason
 * 5. Verify only matching suspensions are returned
 * 6. Test multiple reason filters for accurate categorization
 */
export async function test_api_suspension_search_by_reason(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create member accounts for suspension targets
  const violationReasons = [
    "spam",
    "harassment",
    "hate_speech",
    "misinformation",
  ] as const;
  const members: IDiscussionBoardMember.ISummary[] = [];

  for (const reason of violationReasons) {
    const memberData = {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      password: "MemberPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate;

    const member = await api.functional.discussionBoard.members.create(
      connection,
      {
        body: memberData,
      },
    );
    typia.assert(member);
    members.push(member);
  }

  // Step 3: Create suspensions with different violation reasons
  const suspensions: IDiscussionBoardUserSuspension[] = [];
  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  for (let i = 0; i < violationReasons.length; i++) {
    const suspensionData = {
      discussion_board_member_id: members[i].id,
      suspension_reason: violationReasons[i],
      suspension_details: `User violated community guidelines by engaging in ${violationReasons[i]} activities. This suspension is issued after review of reported content.`,
      suspended_at: now.toISOString(),
      expires_at: thirtyDaysLater.toISOString(),
    } satisfies IDiscussionBoardUserSuspension.ICreate;

    const suspension =
      await api.functional.discussionBoard.moderator.moderation.suspensions.create(
        connection,
        {
          body: suspensionData,
        },
      );
    typia.assert(suspension);
    suspensions.push(suspension);
  }

  // Step 4: Test filtering by specific reason - spam
  const spamSearchRequest = {
    page: 1,
    limit: 10,
    search: "spam",
  } satisfies IDiscussionBoardUserSuspension.IRequest;

  const spamResults: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: spamSearchRequest,
      },
    );
  typia.assert(spamResults);

  // Step 5: Verify spam filter results
  TestValidator.predicate(
    "spam search should return results",
    spamResults.data.length > 0,
  );

  for (const result of spamResults.data) {
    TestValidator.predicate(
      "spam suspension reason should contain spam keyword",
      result.suspension_reason.toLowerCase().includes("spam"),
    );
  }

  // Step 6: Test filtering by harassment
  const harassmentSearchRequest = {
    page: 1,
    limit: 10,
    search: "harassment",
  } satisfies IDiscussionBoardUserSuspension.IRequest;

  const harassmentResults: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: harassmentSearchRequest,
      },
    );
  typia.assert(harassmentResults);

  TestValidator.predicate(
    "harassment search should return results",
    harassmentResults.data.length > 0,
  );

  for (const result of harassmentResults.data) {
    TestValidator.predicate(
      "harassment suspension reason should contain harassment keyword",
      result.suspension_reason.toLowerCase().includes("harassment"),
    );
  }

  // Step 7: Test filtering by hate_speech
  const hateSpeechSearchRequest = {
    page: 1,
    limit: 10,
    search: "hate_speech",
  } satisfies IDiscussionBoardUserSuspension.IRequest;

  const hateSpeechResults: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: hateSpeechSearchRequest,
      },
    );
  typia.assert(hateSpeechResults);

  TestValidator.predicate(
    "hate_speech search should return results",
    hateSpeechResults.data.length > 0,
  );

  for (const result of hateSpeechResults.data) {
    TestValidator.predicate(
      "hate_speech suspension reason should contain hate keyword",
      result.suspension_reason.toLowerCase().includes("hate"),
    );
  }

  // Step 8: Test filtering by misinformation
  const misinformationSearchRequest = {
    page: 1,
    limit: 10,
    search: "misinformation",
  } satisfies IDiscussionBoardUserSuspension.IRequest;

  const misinformationResults: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: misinformationSearchRequest,
      },
    );
  typia.assert(misinformationResults);

  TestValidator.predicate(
    "misinformation search should return results",
    misinformationResults.data.length > 0,
  );

  for (const result of misinformationResults.data) {
    TestValidator.predicate(
      "misinformation suspension reason should contain misinformation keyword",
      result.suspension_reason.toLowerCase().includes("misinformation"),
    );
  }

  // Step 9: Verify distinct filtering - spam results should not contain harassment
  for (const spamResult of spamResults.data) {
    TestValidator.predicate(
      "spam filtered results should not contain harassment reasons",
      !spamResult.suspension_reason.toLowerCase().includes("harassment"),
    );
  }
}
