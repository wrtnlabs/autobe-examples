import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

// Define local interfaces for test use only to specify expected properties
interface IUserUpdate {
  display_name: string;
  bio?: string | null;
  avatar_url?: string | null;
}
interface IUserProfile {
  display_name: string;
  bio?: string | null;
  avatar_url?: string | null;
}
export async function test_api_user_profile_update_complete(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test scenario 1: Successful complete profile update
   */
  // 1. Create a new connection for join and authorize user join
  const joinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(joinConnection, {});
  // 2. Create a new user-specific connection with authorization token
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = {
    Authorization: authorized.token.access,
  };
  // 3. Prepare a full update body with display_name (mandatory), bio (optional), avatar_url (optional)
  const fullUpdateBody: IUserUpdate = {
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    avatar_url: `https://avatars.example.com/${RandomGenerator.alphabets(10)}`,
  };
  // 4. Update the profile using the utility function
  const fullUpdatedProfileRaw =
    await api.functional.communityPlatform.user.profile.updateProfile(
      userConnection,
      { body: fullUpdateBody as ICommunityPlatformUser.IUpdate },
    );
  // Assert the response type as IUserProfile for test
  const fullUpdatedProfile = typia.assert(
    fullUpdatedProfileRaw,
  ) as IUserProfile;
  // 5. Validate the returned profile
  TestValidator.equals(
    "profile update - display_name",
    fullUpdatedProfile.display_name,
    fullUpdateBody.display_name,
  );
  TestValidator.equals(
    "profile update - bio",
    fullUpdatedProfile.bio ?? null,
    fullUpdateBody.bio ?? null,
  );
  TestValidator.equals(
    "profile update - avatar_url",
    fullUpdatedProfile.avatar_url ?? null,
    fullUpdateBody.avatar_url ?? null,
  );
  /**
   * Test scenario 2: Successful partial profile update
   */
  // 6. Prepare partial update body with only display_name field updated
  const partialUpdateBody: IUserUpdate = {
    display_name: RandomGenerator.name(),
  };
  // 7. Update the profile again with partial update
  const partialUpdatedProfileRaw =
    await api.functional.communityPlatform.user.profile.updateProfile(
      userConnection,
      { body: partialUpdateBody as ICommunityPlatformUser.IUpdate },
    );
  // Assert response
  const partialUpdatedProfile = typia.assert(
    partialUpdatedProfileRaw,
  ) as IUserProfile;
  // 8. Validate the returned profile
  TestValidator.equals(
    "partial update - display_name",
    partialUpdatedProfile.display_name,
    partialUpdateBody.display_name,
  );
  // 9. Confirm that bio and avatar_url were retained from previous full update
  TestValidator.equals(
    "partial update - bio retained",
    partialUpdatedProfile.bio ?? null,
    fullUpdatedProfile.bio ?? null,
  );
  TestValidator.equals(
    "partial update - avatar_url retained",
    partialUpdatedProfile.avatar_url ?? null,
    fullUpdatedProfile.avatar_url ?? null,
  );
}
