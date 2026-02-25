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

export async function test_api_member_profile_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member
  const registerConnection: api.IConnection = { host: connection.host };
  const registerEmail = RandomGenerator.alphaNumeric(10) + "@test.com";
  const registerPassword = RandomGenerator.alphaNumeric(16);
  const initialDisplayName = RandomGenerator.name();
  const registered = await api.functional.discussionBoard.auth.member.join(
    registerConnection,
    {
      body: {
        email: registerEmail,
        password: registerPassword,
        displayName: initialDisplayName,
        passwordConfirmation: registerPassword,
      } satisfies IDiscussionBoardMember.IJoin,
    },
  );
  typia.assert(registered);
  // Step 2: Login to get fresh authentication
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedin = await api.functional.discussionBoard.auth.member.login(
    loginConnection,
    {
      body: {
        email: registerEmail,
        password: registerPassword,
        href: "https://example.com/login",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardMember.ILogin,
    },
  );
  typia.assert(loggedin);
  // Step 3: Update profile
  const newDisplayName = RandomGenerator.name();
  const newBio = RandomGenerator.paragraph({ sentences: 2 });
  const updatedProfile =
    await api.functional.discussionBoard.member.profile.update(
      loginConnection,
      {
        body: {
          display_name: newDisplayName,
          bio: newBio,
        } satisfies IDiscussionBoardMember.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // Step 4: Validate updated profile
  TestValidator.equals(
    "display_name updated",
    updatedProfile.displayName,
    newDisplayName,
  );
  TestValidator.equals("bio updated", updatedProfile.bio, newBio);
  TestValidator.predicate(
    "has updated_at timestamp",
    updatedProfile.updatedAt !== undefined,
  );
  // Step 5: Verify member information is correct
  TestValidator.equals("email unchanged", updatedProfile.email, registerEmail);
  TestValidator.equals("is_active is true", updatedProfile.isActive, true);
  TestValidator.equals("is_admin is false", updatedProfile.isAdmin, false);
  TestValidator.equals(
    "is_super_admin is false",
    updatedProfile.isSuperAdmin,
    false,
  );
}