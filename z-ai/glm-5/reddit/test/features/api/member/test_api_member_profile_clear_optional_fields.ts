import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
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
 * Test clearing optional profile fields by setting them to null.
 *
 * Scenario:
 * 1. Member registration and authentication
 * 2. First update: Set all three fields (display_name, bio, avatar_url)
 * 3. Second update: Clear bio and avatar_url by setting to null
 * 4. Verify only display_name remains set, bio and avatar_url are cleared
 */
export async function test_api_member_profile_clear_optional_fields(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Step 2: First update - set all three optional fields
  const displayName = RandomGenerator.name();
  const bio = RandomGenerator.paragraph({ sentences: 3 });
  const avatarUrl = typia.random<string & tags.Format<"url">>();
  const firstUpdate = await api.functional.community.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: displayName,
        bio: bio,
        avatar_url: avatarUrl,
      } satisfies ICommunityMember.IUpdate,
    },
  );
  typia.assert(firstUpdate);
  // Verify first update applied correctly
  TestValidator.equals(
    "display_name set",
    firstUpdate.display_name,
    displayName,
  );
  TestValidator.equals("bio set", firstUpdate.bio, bio);
  TestValidator.equals("avatar_url set", firstUpdate.avatar_url, avatarUrl);
  // Step 3: Second update - clear bio and avatar_url by setting to null
  const secondUpdate = await api.functional.community.member.profile.update(
    memberConnection,
    {
      body: {
        bio: null,
        avatar_url: null,
      } satisfies ICommunityMember.IUpdate,
    },
  );
  typia.assert(secondUpdate);
  // Step 4: Verify optional fields are cleared while display_name is preserved
  TestValidator.equals(
    "display_name preserved",
    secondUpdate.display_name,
    displayName,
  );
  TestValidator.equals("bio cleared", secondUpdate.bio, null);
  TestValidator.equals("avatar_url cleared", secondUpdate.avatar_url, null);
}
