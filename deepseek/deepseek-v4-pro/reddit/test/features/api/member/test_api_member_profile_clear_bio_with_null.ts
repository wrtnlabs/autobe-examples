import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
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
 * Test that a member can clear their bio by sending null as the bio value.
 *
 * Validates the bio-clearing workflow through the member profile update endpoint. After registering and authenticating as a new member, the test first sets a text bio via PATCH, then sends a second PATCH with bio explicitly set to null. The response is verified to confirm the bio has been cleared while other profile fields remain intact.
 *
 * 1. Register and authenticate a new member via the join endpoint.
 * 2. Update the profile with a text bio via PATCH /communityHub/member/profile.
 * 3. Validate the response shows the bio as the set text.
 * 4. Send a second PATCH with bio set to null.
 * 5. Validate the response shows bio as null, confirming it was cleared.
 * 6. Verify other profile fields (username, display_name) remain intact.
 */
export async function test_api_member_profile_clear_bio_with_null(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Set a text bio on the profile
  const bioText = RandomGenerator.paragraph({ sentences: 2 });
  const withBio = await api.functional.communityHub.member.profile.update(
    memberConnection,
    {
      body: {
        bio: bioText,
      } satisfies ICommunityHubMember.IUpdate,
    },
  );
  typia.assert(withBio);
  // 3. Validate bio was set
  TestValidator.equals("bio should be set", withBio.bio, bioText);
  // 4. Clear the bio by sending null
  const cleared = await api.functional.communityHub.member.profile.update(
    memberConnection,
    {
      body: {
        bio: null,
      } satisfies ICommunityHubMember.IUpdate,
    },
  );
  typia.assert(cleared);
  // 5. Validate bio is null
  TestValidator.equals("bio should be cleared", cleared.bio, null);
  // 6. Verify other fields remain intact
  TestValidator.equals(
    "username unchanged",
    cleared.username,
    authorized.username,
  );
  TestValidator.equals(
    "display_name unchanged",
    cleared.display_name,
    authorized.display_name,
  );
}
