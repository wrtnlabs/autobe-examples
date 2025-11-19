import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test bio field length validation enforcing the 500 character maximum
 * constraint.
 *
 * This test validates that the member profile update operation correctly
 * enforces the bio field's maxLength constraint of 500 characters. The test
 * creates and authenticates a member account, then performs three validation
 * scenarios:
 *
 * 1. Attempt to update with a bio exceeding 500 characters - should fail with
 *    validation error
 * 2. Update with a bio exactly at 500 characters - should succeed
 * 3. Update with a bio under 500 characters - should succeed and verify the update
 *
 * The test ensures that the API properly validates the
 * IDiscussionBoardMember.IUpdate.bio constraint defined in the schema, which
 * specifies a maximum length of 500 characters using the tags.MaxLength<500>
 * constraint.
 */
export async function test_api_member_profile_update_bio_length_validation(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "testPassword123!";
  const memberUsername = RandomGenerator.alphaNumeric(12);

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        username: memberUsername,
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 5 }),
        ip: "127.0.0.1",
        href: "https://example.com/register",
        referrer: "https://example.com/home",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Test with bio exceeding 500 characters (should fail)
  const bioExceeding500 = RandomGenerator.alphabets(501);

  await TestValidator.error(
    "bio exceeding 500 characters should fail validation",
    async () => {
      await api.functional.discussionBoard.member.members.update(connection, {
        memberId: member.id,
        body: {
          bio: bioExceeding500,
        } satisfies IDiscussionBoardMember.IUpdate,
      });
    },
  );

  // Step 3: Test with bio exactly at 500 characters (should succeed)
  const bioExactly500 = RandomGenerator.alphabets(500);

  const updatedMemberAt500: IDiscussionBoardMember =
    await api.functional.discussionBoard.member.members.update(connection, {
      memberId: member.id,
      body: {
        bio: bioExactly500,
      } satisfies IDiscussionBoardMember.IUpdate,
    });
  typia.assert(updatedMemberAt500);
  typia.assertGuard(updatedMemberAt500.bio!);
  TestValidator.equals(
    "bio length should be exactly 500",
    updatedMemberAt500.bio.length,
    500,
  );
  TestValidator.equals(
    "bio content should match",
    updatedMemberAt500.bio,
    bioExactly500,
  );

  // Step 4: Test with bio under 500 characters (should succeed)
  const bioUnder500 = RandomGenerator.paragraph({
    sentences: 10,
    wordMin: 4,
    wordMax: 8,
  });
  TestValidator.predicate(
    "generated bio should be under 500 characters",
    bioUnder500.length < 500,
  );

  const updatedMemberUnder500: IDiscussionBoardMember =
    await api.functional.discussionBoard.member.members.update(connection, {
      memberId: member.id,
      body: {
        bio: bioUnder500,
      } satisfies IDiscussionBoardMember.IUpdate,
    });
  typia.assert(updatedMemberUnder500);
  typia.assertGuard(updatedMemberUnder500.bio!);
  TestValidator.predicate(
    "updated bio length should be under 500",
    updatedMemberUnder500.bio.length < 500,
  );
  TestValidator.equals(
    "bio content should match input",
    updatedMemberUnder500.bio,
    bioUnder500,
  );
}
