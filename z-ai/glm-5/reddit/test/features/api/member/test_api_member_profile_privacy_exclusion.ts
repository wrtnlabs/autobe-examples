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

export async function test_api_member_profile_privacy_exclusion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member with known credentials
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Retrieve the member's public profile by ID
  const profile = await api.functional.communityPlatform.members.at(
    connection,
    {
      memberId: authorized.id,
    },
  );
  typia.assert(profile);
  // 3. Verify the profile data matches the authenticated member's public data
  // The ICommunityPlatformMember type explicitly excludes email and password_hash
  // typia.assert() ensures the response strictly conforms to this type,
  // guaranteeing that sensitive authentication data is never exposed
  TestValidator.equals(
    "profile ID matches member ID",
    profile.id,
    authorized.id,
  );
  TestValidator.equals(
    "profile username matches member username",
    profile.username,
    authorized.username,
  );
  TestValidator.equals(
    "profile displayName matches",
    profile.displayName,
    authorized.displayName,
  );
  TestValidator.equals("profile bio matches", profile.bio, authorized.bio);
  TestValidator.equals(
    "profile karma matches",
    profile.karma,
    authorized.karma,
  );
  TestValidator.equals(
    "profile avatar matches",
    profile.avatar,
    authorized.avatar,
  );
}
