import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_reflection_on_refresh(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create a new member account via join operation
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {});
  typia.assert(joinResult);
  // Store the refresh token for later use
  const refreshToken = joinResult.token.refresh;
  // Update the member profile with display name and bio
  const displayName = RandomGenerator.name();
  const bio = RandomGenerator.paragraph({ sentences: 3 });
  const updatedProfile =
    await api.functional.communityPlatform.member.profile.update(
      memberConnection,
      {
        body: {
          display_name: displayName,
          bio: bio,
        } satisfies ICommunityPlatformMember.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // Execution: Call refresh endpoint with the valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_member_refresh(refreshConnection, {
    body: { refreshToken },
  });
  typia.assert(refreshResult);
  // Validation: Verify the response includes the updated display name
  TestValidator.equals(
    "display name matches",
    refreshResult.displayName,
    displayName,
  );
  // Verify the response includes the updated bio text
  TestValidator.equals("bio matches", refreshResult.bio, bio);
  // Verify avatar is null (no avatar uploaded)
  TestValidator.equals("avatar is null", refreshResult.avatar, null);
  // Verify karma value is accurate (0 for new member with no votes)
  TestValidator.equals("karma is 0", refreshResult.karma, 0);
  // Verify member ID matches original
  TestValidator.equals("member ID matches", refreshResult.id, joinResult.id);
  // Verify username matches original
  TestValidator.equals(
    "username matches",
    refreshResult.username,
    joinResult.username,
  );
}
