import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_update_partial_fields(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(),
    displayName: RandomGenerator.name(),
  } satisfies IRedditPlatformMember.IJoin;
  const memberProfile = await authorize_member_join(memberConnection, {
    body: memberData,
  });
  typia.assert(memberProfile);
  // Step 2: Get original profile data to compare
  const originalProfile = memberProfile;
  // Step 3: Update only display_name field
  const updatedDisplayName = RandomGenerator.name();
  const updateBody = {
    display_name: updatedDisplayName,
  } satisfies IRedditPlatformMember.IUpdate;
  const updatedProfile =
    await api.functional.redditPlatform.members.updateProfile(
      memberConnection,
      {
        body: updateBody,
      },
    );
  typia.assert(updatedProfile);
  // Step 4: Verify that only display_name is updated
  TestValidator.equals(
    "display_name updated",
    updatedProfile.display_name,
    updatedDisplayName,
  );
  TestValidator.equals(
    "bio unchanged",
    updatedProfile.bio,
    originalProfile.bio,
  );
  TestValidator.equals(
    "avatar_url unchanged",
    updatedProfile.avatar_url,
    originalProfile.avatar_url,
  );
  TestValidator.equals(
    "username unchanged",
    updatedProfile.username,
    originalProfile.username,
  );
  TestValidator.equals(
    "email unchanged",
    updatedProfile.email,
    originalProfile.email,
  );
  // Step 5: Verify updated_at timestamp is changed (should be later than original)
  const originalUpdatedAt = new Date(originalProfile.updated_at).getTime();
  const updatedUpdatedAt = new Date(updatedProfile.updated_at).getTime();
  TestValidator.predicate(
    "updated_at timestamp increased",
    updatedUpdatedAt > originalUpdatedAt,
  );
}
