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

export async function test_api_member_profile_bio_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      passwordConfirmation: RandomGenerator.alphaNumeric(16), // Added password confirmation
      displayName: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);
  // 2. Update profile with valid bio text within 500 characters
  const validBio = RandomGenerator.paragraph({ sentences: 5 }) as string &
    tags.MaxLength<500>;
  const updateWithBio =
    await api.functional.discussionBoard.member.profile.update(
      memberConnection,
      {
        body: {
          display_name: member.member.display_name,
          bio: validBio,
        } satisfies IDiscussionBoardMember.IUpdate,
      },
    );
  typia.assert(updateWithBio);
  TestValidator.equals("bio matches input", updateWithBio.bio, validBio);
  // 3. Update profile with empty string bio
  const updateWithEmptyBio =
    await api.functional.discussionBoard.member.profile.update(
      memberConnection,
      {
        body: {
          display_name: member.member.display_name,
          bio: "",
        } satisfies IDiscussionBoardMember.IUpdate,
      },
    );
  typia.assert(updateWithEmptyBio);
  TestValidator.equals("empty bio preserved", updateWithEmptyBio.bio, "");
  // 4. Update profile with explicit null bio
  const updateWithNullBio =
    await api.functional.discussionBoard.member.profile.update(
      memberConnection,
      {
        body: {
          display_name: member.member.display_name,
          bio: null,
        } satisfies IDiscussionBoardMember.IUpdate,
      },
    );
  typia.assert(updateWithNullBio);
  TestValidator.equals("null bio preserved", updateWithNullBio.bio, null);
  // 5. Update profile without bio field (undefined)
  const updateWithoutBio =
    await api.functional.discussionBoard.member.profile.update(
      memberConnection,
      {
        body: {
          display_name: member.member.display_name,
        } satisfies IDiscussionBoardMember.IUpdate,
      },
    );
  typia.assert(updateWithoutBio);
  TestValidator.equals(
    "bio remains null when omitted",
    updateWithoutBio.bio,
    null,
  );
  // 6. Test 500 character limit with exact boundary value
  const maxBio = Array.from({ length: 500 }, () =>
    RandomGenerator.alphabets(1),
  ).join("") as string & tags.MaxLength<500>;
  const updateWithMaxBio =
    await api.functional.discussionBoard.member.profile.update(
      memberConnection,
      {
        body: {
          display_name: member.member.display_name,
          bio: maxBio,
        } satisfies IDiscussionBoardMember.IUpdate,
      },
    );
  typia.assert(updateWithMaxBio);
  TestValidator.equals("max bio length", updateWithMaxBio.bio?.length, 500);
  // 7. Test unauthenticated access should fail
  const publicConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthenticated access denied", async () => {
    await api.functional.discussionBoard.member.profile.update(
      publicConnection,
      {
        body: {
          display_name: "test",
          bio: "test",
        } satisfies IDiscussionBoardMember.IUpdate,
      },
    );
  });
}