import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityUserProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_profile_update_partial_fields_unchanged(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member and get an authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Set all three profile fields to establish a known initial state
  const initialDisplayName = RandomGenerator.name();
  const initialBio = RandomGenerator.paragraph({ sentences: 3 });
  const initialAvatarUrl = typia.random<string & tags.Format<"uri">>();
  const initialProfile = await api.functional.community.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: initialDisplayName,
        bio: initialBio,
        avatar_url: initialAvatarUrl,
      } satisfies ICommunityUserProfile.IUpdate,
    },
  );
  typia.assert(initialProfile);
  // Step 3: Update ONLY the bio field, omitting display_name and avatar_url
  const newBio = RandomGenerator.paragraph({ sentences: 2 });
  const partialProfile = await api.functional.community.member.profile.update(
    memberConnection,
    {
      body: {
        bio: newBio,
      } satisfies ICommunityUserProfile.IUpdate,
    },
  );
  typia.assert(partialProfile);
  // Step 4: Validate partial update semantics
  // bio should be updated to the new value
  TestValidator.equals("bio is updated", partialProfile.bio, newBio);
  // displayName should remain unchanged from the initial full update
  TestValidator.equals(
    "displayName is unchanged",
    partialProfile.displayName,
    initialDisplayName,
  );
  // avatarUrl should remain unchanged from the initial full update
  TestValidator.equals(
    "avatarUrl is unchanged",
    partialProfile.avatarUrl,
    initialAvatarUrl,
  );
  // karmaScore should be 0 (system-managed)
  TestValidator.equals("karmaScore is 0", partialProfile.karmaScore, 0);
}
