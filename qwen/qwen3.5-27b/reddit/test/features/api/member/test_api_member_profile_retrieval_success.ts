import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that an authenticated member can successfully retrieve their complete profile information.
 *
 * 1. Register a new member account with valid credentials
 * 2. Retrieve the authenticated member's profile using GET /redditClone/member/me
 * 3. Validate all profile fields are correctly populated
 * 4. Verify karma is initialized to 0 and account is active (deleted_at is null)
 */
export async function test_api_member_profile_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and register new account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      bio: null,
      avatar_uri: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  // 2. Retrieve authenticated member profile
  const profile =
    await api.functional.redditClone.member.me.at(memberConnection);
  typia.assert(profile);
  // 3. Verify profile fields match registration input
  TestValidator.equals(
    "email matches registration",
    profile.email,
    authorized.email,
  );
  TestValidator.equals(
    "username matches registration",
    profile.username,
    authorized.username,
  );
  TestValidator.equals(
    "display_name matches registration",
    profile.display_name,
    authorized.display_name,
  );
  // 4. Verify karma is initialized to 0 for new account
  TestValidator.equals("karma is 0 for new account", profile.karma, 0);
  // 5. Verify account is active (deleted_at is null)
  TestValidator.equals("account is active", profile.deleted_at, null);
  // 6. Verify timestamps are present and valid
  TestValidator.predicate(
    "created_at is present",
    profile.created_at !== null && profile.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is present",
    profile.updated_at !== null && profile.updated_at.length > 0,
  );
  // 7. Verify bio and avatar_uri are null (as registered)
  TestValidator.equals("bio is null", profile.bio, null);
  TestValidator.equals("avatar_uri is null", profile.avatar_uri, null);
}
