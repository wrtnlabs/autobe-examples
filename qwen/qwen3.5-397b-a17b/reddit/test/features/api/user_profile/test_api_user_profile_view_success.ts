import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserAvatar } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserAvatar";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful retrieval of a user's public profile by profile ID.
 *
 * This test verifies:
 * 1. Member account creation via authorize_member_join
 * 2. Profile retrieval using GET /redditCommunity/profiles/{profileId}
 * 3. Response contains all required fields with correct types
 * 4. Profile data matches registration data (username)
 * 5. Avatar is null for newly created account
 * 6. Endpoint works without authentication (guest access)
 */
export async function test_api_user_profile_view_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account using utility function
  const username = RandomGenerator.name(1);
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: username,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Retrieve the user's profile using their member ID as profileId
  // Use a fresh connection without auth headers to verify guest access works
  const guestConnection: api.IConnection = { host: connection.host };
  const profile = await api.functional.redditCommunity.profiles.at(
    guestConnection,
    {
      profileId: memberAuth.id,
    },
  );
  typia.assert(profile);
  // 3. Validate profile structure and data matches registration
  TestValidator.equals(
    "profile id matches member id",
    profile.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "profile username matches registration username",
    profile.member.username,
    username,
  );
  TestValidator.equals(
    "member id matches profile member id",
    profile.member.id,
    memberAuth.id,
  );
  TestValidator.predicate(
    "display_name is not empty",
    profile.display_name.length > 0,
  );
  TestValidator.predicate("bio is null for new account", profile.bio === null);
  TestValidator.predicate("karma_score starts at 0", profile.karma_score === 0);
  TestValidator.predicate(
    "avatar is null for new account",
    profile.avatar === null || profile.avatar === undefined,
  );
}
