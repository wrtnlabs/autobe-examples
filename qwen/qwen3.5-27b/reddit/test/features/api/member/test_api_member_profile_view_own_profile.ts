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
 * Test that an authenticated member can retrieve their own profile information.
 *
 * 1. Authenticate as a new member using join endpoint
 * 2. Retrieve the member's own profile using the member ID from join response
 * 3. Validate that all profile fields are correctly returned
 */
export async function test_api_member_profile_view_own_profile(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      avatar_uri: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  // 2. Retrieve own profile using member ID
  const profile = await api.functional.redditClone.members.at(
    memberConnection,
    {
      memberId: authorized.id,
    },
  );
  typia.assert(profile);
  // 3. Validate profile data
  TestValidator.equals("member ID matches", profile.id, authorized.id);
  TestValidator.equals("email matches", profile.email, authorized.email);
  TestValidator.equals(
    "username matches",
    profile.username,
    authorized.username,
  );
  TestValidator.equals(
    "display_name matches",
    profile.display_name,
    authorized.display_name,
  );
  TestValidator.equals("bio matches", profile.bio, authorized.bio);
  TestValidator.equals(
    "avatar_uri matches",
    profile.avatar_uri,
    authorized.avatar_uri,
  );
  TestValidator.equals("karma matches", profile.karma, authorized.karma);
  TestValidator.equals(
    "created_at matches",
    profile.created_at,
    authorized.created_at,
  );
  TestValidator.equals("deleted_at is null", profile.deleted_at, null);
  TestValidator.predicate("karma is zero for new member", profile.karma === 0);
}
