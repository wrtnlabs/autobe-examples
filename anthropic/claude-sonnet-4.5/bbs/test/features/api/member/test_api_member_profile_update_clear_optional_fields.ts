import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test clearing optional profile fields by setting them to null.
 *
 * Validates that members can explicitly clear optional profile fields
 * (display_name, bio, avatar_url) by setting them to null in update requests.
 * This ensures users have control over removing optional profile information.
 *
 * Steps:
 *
 * 1. Create member account with populated optional fields (display_name, bio)
 * 2. Update profile to clear bio by setting it to null
 * 3. Verify bio becomes null in the response
 * 4. Update again to clear display_name and avatar_url by setting them to null
 * 5. Confirm all optional fields are successfully cleared
 */
export async function test_api_member_profile_update_clear_optional_fields(
  connection: api.IConnection,
) {
  // Step 1: Create member account with populated optional fields
  const initialEmail = typia.random<string & tags.Format<"email">>();
  const initialUsername = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<30>
  >();
  const initialDisplayName = RandomGenerator.name(2);
  const initialBio = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });

  const createBody = {
    email: initialEmail,
    password: typia.random<string & tags.Format<"password">>(),
    username: initialUsername,
    display_name: initialDisplayName,
    bio: initialBio,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: createBody });
  typia.assert(member);

  // Verify initial optional fields are populated
  TestValidator.equals(
    "initial display_name should match",
    member.display_name,
    initialDisplayName,
  );
  TestValidator.equals("initial bio should match", member.bio, initialBio);

  // Step 2: Update profile to clear bio by setting it to null
  const firstUpdateBody = {
    bio: null,
  } satisfies IDiscussionBoardMember.IUpdate;

  const afterFirstUpdate: IDiscussionBoardMember =
    await api.functional.discussionBoard.member.members.update(connection, {
      memberId: member.id,
      body: firstUpdateBody,
    });
  typia.assert(afterFirstUpdate);

  // Step 3: Verify bio becomes null
  TestValidator.equals(
    "bio should be null after first update",
    afterFirstUpdate.bio,
    null,
  );
  TestValidator.equals(
    "display_name should remain unchanged",
    afterFirstUpdate.display_name,
    initialDisplayName,
  );

  // Step 4: Update again to clear display_name and avatar_url
  const secondUpdateBody = {
    display_name: null,
    avatar_url: null,
  } satisfies IDiscussionBoardMember.IUpdate;

  const afterSecondUpdate: IDiscussionBoardMember =
    await api.functional.discussionBoard.member.members.update(connection, {
      memberId: member.id,
      body: secondUpdateBody,
    });
  typia.assert(afterSecondUpdate);

  // Step 5: Confirm all optional fields are cleared
  TestValidator.equals(
    "display_name should be null",
    afterSecondUpdate.display_name,
    null,
  );
  TestValidator.equals("bio should remain null", afterSecondUpdate.bio, null);
  TestValidator.equals(
    "avatar_url should be null",
    afterSecondUpdate.avatar_url,
    null,
  );
}
