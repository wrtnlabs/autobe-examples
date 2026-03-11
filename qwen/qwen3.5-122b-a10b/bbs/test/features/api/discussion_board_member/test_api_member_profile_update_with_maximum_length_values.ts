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
 * Test member profile update with maximum length values for boundary validation.
 * 1. Register a new member account via join
 * 2. Update profile with displayName at exactly 100 characters (maximum)
 * 3. Update profile with bio at exactly 500 characters (maximum)
 * 4. Validate the system accepts these boundary values and persists them correctly
 */
export async function test_api_member_profile_update_with_maximum_length_values(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Create member-specific connection with authentication token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: joinResult.token.access },
  };
  // 3. Generate maximum length values
  const maxDisplayName = RandomGenerator.alphabets(100); // Exactly 100 characters
  const maxBio = RandomGenerator.alphabets(500); // Exactly 500 characters
  // 4. Update profile with maximum length values
  const updateBody = {
    displayName: maxDisplayName,
    bio: maxBio,
  } satisfies IDiscussionBoardMember.IUpdate;
  const updatedProfile =
    await api.functional.discussionBoard.member.profile.update(
      memberConnection,
      { body: updateBody },
    );
  typia.assert(updatedProfile);
  // 5. Validate the profile was updated correctly with maximum length values
  TestValidator.equals(
    "displayName length is 100",
    updatedProfile.display_name.length,
    100,
  );
  TestValidator.equals(
    "bio length is 500",
    updatedProfile.bio?.length ?? 0,
    500,
  );
  TestValidator.equals(
    "displayName matches input",
    updatedProfile.display_name,
    maxDisplayName,
  );
  TestValidator.equals("bio matches input", updatedProfile.bio, maxBio);
}
