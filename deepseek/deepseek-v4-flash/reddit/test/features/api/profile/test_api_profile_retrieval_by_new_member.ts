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
 * Test that a newly registered member can successfully retrieve their own profile.
 *
 * Validates the complete profile retrieval workflow from registration through authenticated profile access. Ensures that a member who has just joined the platform can immediately view their own profile with correct initial values.
 *
 * Special attention is given to verifying that fields default to expected values for new members: karma starts at zero, biography and avatar are null until explicitly set, and member identity fields match the registration input.
 *
 * 1. Register a new member with randomized email, username, and password.
 * 2. Retrieve the authenticated member's profile using the JWT token from step 1.
 * 3. Validate the profile structure and all derived field values.
 */
export async function test_api_profile_retrieval_by_new_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name(1);
  const password = RandomGenerator.alphaNumeric(16);
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      username,
      password,
    } satisfies DeepPartial<ICommunityPlatformMember.IJoin>,
  });
  typia.assert(authorized);
  // 2. Retrieve own profile
  const profile =
    await api.functional.communityPlatform.member.profile.at(memberConnection);
  typia.assert(profile);
  // 3. Validate field values for a brand-new member
  TestValidator.predicate(
    "display_name is non-empty",
    () => profile.display_name.length > 0,
  );
  TestValidator.equals("biography is null", profile.biography, null);
  TestValidator.equals("avatar_uri is null", profile.avatar_uri, null);
  TestValidator.equals("karma is 0", profile.karma, 0);
  // 4. Validate member summary matches registration
  TestValidator.equals("member.id matches", profile.member.id, authorized.id);
  TestValidator.equals("member.email matches", profile.member.email, email);
  TestValidator.equals(
    "member.username matches",
    profile.member.username,
    username,
  );
  // 5. Validate account is active (not soft-deleted)
  TestValidator.equals(
    "member.deleted_at is null",
    profile.member.deleted_at,
    null,
  );
}
