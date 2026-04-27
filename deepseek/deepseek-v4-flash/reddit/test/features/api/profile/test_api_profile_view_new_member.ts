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

/**
 * Test that a newly registered member's public profile is successfully retrieved with all expected default fields.
 *
 * Validates the complete profile view flow: member registration auto-creates a profile with zero karma, null biography, null avatar, and a display name. Ensures the profile is publicly accessible without authentication and that all fields from the ICommunityPlatformProfile schema are correctly populated.
 *
 * Special attention is given to verifying that default values (karma=0, biography=null, avatar_uri=null) are correct for a freshly registered member who has not engaged in any platform activities.
 *
 * 1. Register a new member via authorize_member_join, capturing the member UUID.
 * 2. Retrieve the member's public profile via GET /communityPlatform/profiles/{memberId}.
 * 3. Validate the profile response matches expected structure and default values.
 */
export async function test_api_profile_view_new_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member (profile auto-created)
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  const memberId = authorized.id;
  // 2. Retrieve the member's public profile (no auth required — public endpoint)
  const profile = await api.functional.communityPlatform.profiles.at(
    connection,
    { memberId },
  );
  typia.assert(profile);
  // 3. Business logic validations
  // 3.1. Member reference fields match the authorized member data
  TestValidator.equals("member.id matches", profile.member.id, memberId);
  TestValidator.equals(
    "member.email matches",
    profile.member.email,
    authorized.email,
  );
  TestValidator.equals(
    "member.username matches",
    profile.member.username,
    authorized.username,
  );
  TestValidator.equals(
    "member.created_at matches",
    profile.member.created_at,
    authorized.created_at,
  );
  TestValidator.equals(
    "member.deleted_at is null",
    profile.member.deleted_at,
    null,
  );
  // 3.2. Profile default values for a new member
  TestValidator.equals("karma starts at 0", profile.karma, 0);
  TestValidator.equals(
    "biography is null for fresh profile",
    profile.biography,
    null,
  );
  TestValidator.equals(
    "avatar_uri is null for fresh profile",
    profile.avatar_uri,
    null,
  );
  TestValidator.predicate(
    "display_name is non-empty",
    profile.display_name.length > 0,
  );
}
