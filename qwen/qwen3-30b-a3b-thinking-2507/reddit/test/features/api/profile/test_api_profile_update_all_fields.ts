import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_profile_update_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account for testing
  const memberAuth = await authorize_member_join(connection, {
    body: {} satisfies ICommunityPlatformMember.IJoin,
  });
  // 2. Create a connection for the new member using their token
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: `Bearer ${memberAuth.token.access}`,
  };
  // 3. Update profile with valid values
  const updatedProfile =
    await api.functional.communityPlatform.member.profile.update(
      memberConnection,
      {
        body: {
          display_name: "JohnDoe" satisfies string &
            tags.MinLength<1> &
            tags.MaxLength<30>,
          bio: "Software engineer" satisfies string & tags.MaxLength<255>,
          avatar_url: "https://example.com/avatar.jpg" satisfies string &
            tags.Format<"uri">,
        } satisfies ICommunityPlatformProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 4. Verify the updates
  TestValidator.equals(
    "display name matches",
    updatedProfile.display_name,
    "JohnDoe",
  );
  TestValidator.equals("bio matches", updatedProfile.bio, "Software engineer");
  TestValidator.equals(
    "avatar URL matches",
    updatedProfile.avatar_url,
    "https://example.com/avatar.jpg",
  );
}
