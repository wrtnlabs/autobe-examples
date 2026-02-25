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
 * Test partial profile update where only specific fields are modified
 * while omitted fields retain their current values.
 *
 * Test flow:
 * 1. Register a new member account
 * 2. First update: Set display_name only
 * 3. Verify display_name is set, bio and avatar_url remain null
 * 4. Second update: Set bio only (omit display_name and avatar_url)
 * 5. Verify display_name preserved, bio updated, avatar_url still null
 */
export async function test_api_member_profile_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {});
  typia.assert(authResult);
  // Verify initial state - no display_name, bio, or avatar_url set
  TestValidator.equals(
    "initial display_name is null",
    authResult.display_name,
    null,
  );
  TestValidator.equals("initial bio is null", authResult.bio, null);
  TestValidator.equals(
    "initial avatar_url is null",
    authResult.avatar_url,
    null,
  );
  // Step 2: First update - set only display_name
  const displayName = RandomGenerator.name();
  const firstUpdate = await api.functional.community.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: displayName,
      } satisfies ICommunityMember.IUpdate,
    },
  );
  typia.assert(firstUpdate);
  // Step 3: Verify first update results
  TestValidator.equals(
    "display_name set correctly",
    firstUpdate.display_name,
    displayName,
  );
  TestValidator.equals(
    "bio remains null after first update",
    firstUpdate.bio,
    null,
  );
  TestValidator.equals(
    "avatar_url remains null after first update",
    firstUpdate.avatar_url,
    null,
  );
  // Step 4: Second update - set only bio, omit display_name and avatar_url
  const bio = RandomGenerator.paragraph({ sentences: 3 });
  const secondUpdate = await api.functional.community.member.profile.update(
    memberConnection,
    {
      body: {
        bio: bio,
      } satisfies ICommunityMember.IUpdate,
    },
  );
  typia.assert(secondUpdate);
  // Step 5: Verify second update results - display_name should be preserved
  TestValidator.equals(
    "display_name preserved from first update",
    secondUpdate.display_name,
    displayName,
  );
  TestValidator.equals("bio updated correctly", secondUpdate.bio, bio);
  TestValidator.equals(
    "avatar_url still null after second update",
    secondUpdate.avatar_url,
    null,
  );
}
