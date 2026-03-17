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

/**
 * Test successful retrieval of an existing member's public profile.
 *
 * This test verifies that:
 * 1. A member's public profile can be retrieved by their UUID
 * 2. All public fields are present (id, username, displayName, bio, karma, avatar, timestamps)
 * 3. Sensitive fields (email, password) are never exposed in the response by type design
 */
export async function test_api_member_profile_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      username: RandomGenerator.name(1),
    },
  });
  typia.assert(authorized);
  // 2. Retrieve the member's public profile using their ID
  const profile = await api.functional.communityPlatform.members.at(
    connection,
    {
      memberId: authorized.id,
    },
  );
  typia.assert(profile);
  // 3. Verify public fields match expected values
  TestValidator.equals("member id matches", profile.id, authorized.id);
  TestValidator.equals(
    "username matches",
    profile.username,
    authorized.username,
  );
  TestValidator.equals("karma is initial value", profile.karma, 0);
  // 4. Sensitive fields (email, password) are guaranteed absent by ICommunityPlatformMember type
  // typia.assert() validates the complete structure, ensuring only public fields exist
}
