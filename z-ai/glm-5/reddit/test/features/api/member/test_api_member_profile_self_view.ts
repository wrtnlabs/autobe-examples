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
 * Test that a newly registered member can successfully retrieve their own
 * complete profile with all required fields.
 *
 * Validates:
 * 1. Email field is exposed to the profile owner (private information)
 * 2. Karma score initializes to 0
 * 3. Bio and avatar_url are null by default (not set during registration)
 * 4. Username and display_name match the registration data
 * 5. Created_at and updated_at timestamps are recent
 */
export async function test_api_member_profile_self_view(
  connection: api.IConnection,
): Promise<void> {
  // Register a new member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {});
  typia.assert(joinResult);
  // Retrieve the authenticated member's own profile
  const profile =
    await api.functional.community.member.profile.at(memberConnection);
  typia.assert(profile);
  // Validate email is exposed to profile owner (private field)
  TestValidator.equals(
    "email exposed to owner",
    profile.email,
    joinResult.email,
  );
  // Validate karma initializes to 0
  TestValidator.equals("karma initializes to 0", profile.karma, 0);
  // Validate username matches registration
  TestValidator.equals(
    "username matches",
    profile.username,
    joinResult.username,
  );
  // Validate display_name matches registration
  TestValidator.equals(
    "display_name matches",
    profile.display_name,
    joinResult.display_name,
  );
  // Validate bio is null (not set during registration)
  TestValidator.equals("bio is null", profile.bio, null);
  // Validate avatar_url is null (not set during registration)
  TestValidator.equals("avatar_url is null", profile.avatar_url, null);
  // Validate timestamps are recent (account was just created)
  const now = new Date();
  const createdAt = new Date(profile.created_at);
  const updatedAt = new Date(profile.updated_at);
  const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
  TestValidator.predicate(
    "created_at is recent",
    createdAt >= tenMinutesAgo && createdAt <= now,
  );
  TestValidator.predicate(
    "updated_at is recent",
    updatedAt >= tenMinutesAgo && updatedAt <= now,
  );
}
