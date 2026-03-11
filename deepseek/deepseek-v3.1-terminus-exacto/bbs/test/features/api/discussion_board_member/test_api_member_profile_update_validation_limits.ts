import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test profile update validation for display name and bio length limits.
 * Authenticate as member, then attempt profile updates with various boundary conditions:
 * minimum display name (1 character), maximum display name (50 characters),
 * bio at maximum length (500 characters), and empty bio (null).
 * Verify successful updates within limits and appropriate error responses
 * for invalid inputs like empty display name or bio exceeding 500 characters.
 */
export async function test_api_member_profile_update_validation_limits(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(auth);
  // Test 1: Minimum display name (1 character)
  const minDisplayName = "a";
  const update1 = await api.functional.discussionBoard.member.profile.update(
    memberConnection,
    {
      body: {
        displayName: minDisplayName,
        bio: null,
      } satisfies IDiscussionBoardMember.IUpdate,
    },
  );
  typia.assert(update1);
  TestValidator.equals(
    "minimum display name updated",
    update1.display_name,
    minDisplayName,
  );
  TestValidator.predicate("bio is null", update1.bio === null);
  // Test 2: Maximum display name (50 characters)
  const maxDisplayName = RandomGenerator.alphabets(50);
  const update2 = await api.functional.discussionBoard.member.profile.update(
    memberConnection,
    {
      body: {
        displayName: maxDisplayName,
        bio: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardMember.IUpdate,
    },
  );
  typia.assert(update2);
  TestValidator.equals(
    "maximum display name updated",
    update2.display_name,
    maxDisplayName,
  );
  // Test 3: Bio at maximum length (500 characters)
  const maxBio = RandomGenerator.alphabets(500);
  const update3 = await api.functional.discussionBoard.member.profile.update(
    memberConnection,
    {
      body: {
        displayName: RandomGenerator.name(),
        bio: maxBio,
      } satisfies IDiscussionBoardMember.IUpdate,
    },
  );
  typia.assert(update3);
  TestValidator.equals("maximum bio updated", update3.bio, maxBio);
  // Test 4: Bio as undefined (optional field)
  const update4 = await api.functional.discussionBoard.member.profile.update(
    memberConnection,
    {
      body: {
        displayName: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.IUpdate,
    },
  );
  typia.assert(update4);
  // bio can be undefined, null, or string - just validate display name updated
  TestValidator.predicate(
    "display name updated with undefined bio",
    update4.display_name.length > 0,
  );
  // Test 5: Empty display name (0 characters) - should error
  await TestValidator.error("empty display name should fail", async () => {
    await api.functional.discussionBoard.member.profile.update(
      memberConnection,
      {
        body: {
          displayName: "", // violates MinLength<1>
          bio: null,
        } satisfies IDiscussionBoardMember.IUpdate,
      },
    );
  });
  // Test 6: Bio exceeding 500 characters - should error
  const tooLongBio = RandomGenerator.alphabets(501);
  await TestValidator.error(
    "bio exceeding 500 characters should fail",
    async () => {
      await api.functional.discussionBoard.member.profile.update(
        memberConnection,
        {
          body: {
            displayName: RandomGenerator.name(),
            bio: tooLongBio,
          } satisfies IDiscussionBoardMember.IUpdate,
        },
      );
    },
  );
  // Test 7: Display name exceeding 50 characters - should error
  const tooLongDisplayName = RandomGenerator.alphabets(51);
  await TestValidator.error(
    "display name exceeding 50 characters should fail",
    async () => {
      await api.functional.discussionBoard.member.profile.update(
        memberConnection,
        {
          body: {
            displayName: tooLongDisplayName,
            bio: null,
          } satisfies IDiscussionBoardMember.IUpdate,
        },
      );
    },
  );
}
