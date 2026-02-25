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

export async function test_api_member_profile_display_name_validation(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Register a new member for testing
  const memberConnection: api.IConnection = { host: connection.host };
  const registeredMember =
    await api.functional.discussionBoard.auth.member.join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
        passwordConfirmation: RandomGenerator.alphaNumeric(16),
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(registeredMember);
  // Create new connection with token from registration
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = { Authorization: registeredMember.token.access };
  // Test 1: Valid minimum length display name (2 characters)
  const minLengthDisplayName = "AB";
  const result1 = await api.functional.discussionBoard.member.profile.update(
    userConnection,
    {
      body: {
        display_name: minLengthDisplayName,
      } satisfies IDiscussionBoardMember.IUpdate,
    },
  );
  typia.assert(result1);
  TestValidator.equals(
    "min length display name",
    result1.displayName,
    minLengthDisplayName,
  );
  // Test 2: Valid maximum length display name (50 characters)
  const maxLengthDisplayName = RandomGenerator.alphabets(50);
  const result2 = await api.functional.discussionBoard.member.profile.update(
    userConnection,
    {
      body: {
        display_name: maxLengthDisplayName,
      } satisfies IDiscussionBoardMember.IUpdate,
    },
  );
  typia.assert(result2);
  TestValidator.equals(
    "max length display name",
    result2.displayName,
    maxLengthDisplayName,
  );
  // Test 3: Invalid - empty string display name
  await TestValidator.error("empty display name should fail", async () => {
    await api.functional.discussionBoard.member.profile.update(userConnection, {
      body: {
        display_name: "" as any,
      } satisfies IDiscussionBoardMember.IUpdate,
    });
  });
  // Test 4: Invalid - single character display name (below minimum)
  await TestValidator.error(
    "single char display name should fail",
    async () => {
      await api.functional.discussionBoard.member.profile.update(
        userConnection,
        {
          body: {
            display_name: "A" as any,
          } satisfies IDiscussionBoardMember.IUpdate,
        },
      );
    },
  );
  // Test 5: Invalid - display name exceeding 50 characters
  const tooLongDisplayName = RandomGenerator.alphabets(51);
  await TestValidator.error("display name > 50 chars should fail", async () => {
    await api.functional.discussionBoard.member.profile.update(userConnection, {
      body: {
        display_name: tooLongDisplayName as any,
      } satisfies IDiscussionBoardMember.IUpdate,
    });
  });
  // Test 6: Valid display name within range
  const validDisplayName = RandomGenerator.name();
  const result6 = await api.functional.discussionBoard.member.profile.update(
    userConnection,
    {
      body: {
        display_name: validDisplayName,
      } satisfies IDiscussionBoardMember.IUpdate,
    },
  );
  typia.assert(result6);
  TestValidator.equals(
    "valid display name",
    result6.displayName,
    validDisplayName,
  );
  // Test 7: Update with bio as well
  const result7 = await api.functional.discussionBoard.member.profile.update(
    userConnection,
    {
      body: {
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardMember.IUpdate,
    },
  );
  typia.assert(result7);
  TestValidator.predicate(
    "bio should be set",
    result7.bio !== undefined && result7.bio !== null,
  );
}
