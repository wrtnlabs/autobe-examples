import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAppeal";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

export async function test_api_member_appeal_deletion_requirements_validation(
  connection: api.IConnection,
) {
  // Step 1: Create a member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: memberEmail,
      password: "SecurePassword123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create an appeal against a moderation action
  const appeal = await api.functional.redditCommunity.member.appeals.create(
    connection,
    {
      body: {
        rationale: RandomGenerator.paragraph({
          sentences: 10,
          wordMin: 5,
          wordMax: 15,
        }),
        requested_remedy: RandomGenerator.pick([
          "full_reversal",
          "modification",
          "clarification",
        ] as const),
        supporting_evidence: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 8,
        }),
      } satisfies IRedditCommunityAppeal.ICreate,
    },
  );
  typia.assert(appeal);

  // Step 3: Verify appeal creation success and proper structure
  TestValidator.predicate(
    "appeal should have valid UUID format",
    typia.is<string & tags.Format<"uuid">>(appeal.id),
  );
  TestValidator.equals(
    "appeal status should be submitted",
    appeal.status,
    "submitted",
  );
  TestValidator.equals(
    "appeal business status should be filed",
    appeal.business_status,
    "filed",
  );
  TestValidator.equals(
    "appeal appellant should match member",
    appeal.appellant.id,
    member.id,
  );
  TestValidator.equals(
    "appeal appellant nickname should match member",
    appeal.appellant.nickname,
    member.nickname,
  );
  TestValidator.equals(
    "appeal appellant email should match member",
    appeal.appellant.email,
    member.email,
  );

  // Step 4: Delete the appeal using the correct appeal ID
  await api.functional.redditCommunity.member.appeals.erase(connection, {
    appealId: appeal.id,
  });

  // Step 5: Verify deletion was successful (no error thrown)
  TestValidator.predicate("appeal deletion completed successfully", true);

  // Step 6: Test error scenario - attempt to delete non-existent appeal
  const nonExistentAppealId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "deleting non-existent appeal should fail",
    async () => {
      await api.functional.redditCommunity.member.appeals.erase(connection, {
        appealId: nonExistentAppealId,
      });
    },
  );

  // Additional validation: Verify appeal data integrity and constraints
  TestValidator.predicate(
    "appeal created_at should be valid datetime",
    typia.is<string & tags.Format<"date-time">>(appeal.created_at),
  );
  TestValidator.predicate(
    "appeal updated_at should be valid datetime",
    typia.is<string & tags.Format<"date-time">>(appeal.updated_at),
  );
  TestValidator.predicate(
    "appeal rationale meets minimum length requirement",
    appeal.rationale.length >= 50,
  );
  TestValidator.predicate(
    "appeal supporting evidence within max length constraint",
    appeal.supporting_evidence
      ? appeal.supporting_evidence.length <= 5000
      : true,
  );
  TestValidator.predicate(
    "appeal requested remedy is valid",
    ["full_reversal", "modification", "clarification"].includes(
      appeal.requested_remedy,
    ),
  );
  TestValidator.predicate(
    "appeal contains reddit_moderation_action_id",
    typia.is<string & tags.Format<"uuid">>(appeal.reddit_moderation_action_id),
  );
}
