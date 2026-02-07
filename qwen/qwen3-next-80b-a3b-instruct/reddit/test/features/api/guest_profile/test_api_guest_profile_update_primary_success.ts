import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityGuest";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_profile_update_primary_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {
    body: typia.random<ICommunityGuest.IJoin>(),
  });
  typia.assert(authorized);
  // 2. Prepare update data with random values
  const updateData = {
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    avatar_url: `https://example.com/avatar/${RandomGenerator.alphaNumeric(16)}.jpg`,
  } satisfies ICommunityMember.IUpdate;
  // 3. Update profile
  const updatedProfile = await api.functional.community.guest.profile.update(
    guestConnection,
    {
      body: updateData,
    },
  );
  // 4. Define local interface that extends ICommunityMember with expected properties
  interface ICommunityMemberWithProfile extends ICommunityMember {
    display_name: string;
    bio: string;
    avatar_url: string;
    updated_at: string & tags.Format<"date-time">;
  }
  // 5. Cast response to our extended type using typia.assert
  const profileWithFields =
    typia.assert<ICommunityMemberWithProfile>(updatedProfile);
  // 6. Validate update
  TestValidator.equals(
    "display_name updated",
    profileWithFields.display_name,
    updateData.display_name,
  );
  TestValidator.equals("bio updated", profileWithFields.bio, updateData.bio);
  TestValidator.equals(
    "avatar_url updated",
    profileWithFields.avatar_url,
    updateData.avatar_url,
  );
  TestValidator.predicate(
    "updated_at is set",
    profileWithFields.updated_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is ISO date-time",
    new Date(profileWithFields.updated_at).toISOString() ===
      profileWithFields.updated_at,
  );
}
