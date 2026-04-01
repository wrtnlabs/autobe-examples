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
 * Test that an authenticated member can successfully retrieve their own profile information.
 *
 * This test verifies:
 * 1. Member registration creates an authenticated session
 * 2. GET /redditCommunity/member/profile returns complete profile data
 * 3. Profile is automatically created during registration
 * 4. All required fields are properly populated:
 *    - display_name (default or set)
 *    - bio (null by default)
 *    - karma_score (0 for new users)
 *    - member information with username and creation timestamp
 *    - avatar (null if not uploaded)
 *    - profile creation/update timestamps
 * 5. Response matches IRedditCommunityUserProfile schema
 */
export async function test_api_member_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account and establish authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IRedditCommunityMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: joinInput,
  });
  typia.assert(authorized);
  // 2. Retrieve the member's profile using the authenticated connection
  const profile =
    await api.functional.redditCommunity.member.profile.at(memberConnection);
  typia.assert(profile);
  // 3. Validate profile structure and business logic
  TestValidator.equals(
    "username matches registration",
    profile.member.username,
    joinInput.username,
  );
  TestValidator.predicate(
    "display name exists",
    profile.display_name.length > 0,
  );
  TestValidator.equals("bio is null for new user", profile.bio, null);
  TestValidator.equals("karma is 0 for new user", profile.karma_score, 0);
  TestValidator.equals(
    "member id matches authorization",
    profile.member.id,
    authorized.id,
  );
  TestValidator.predicate(
    "member created_at is valid date-time",
    profile.member.created_at.length > 0,
  );
  TestValidator.predicate(
    "profile created_at is valid date-time",
    profile.created_at.length > 0,
  );
  TestValidator.predicate(
    "profile updated_at is valid date-time",
    profile.updated_at.length > 0,
  );
  TestValidator.predicate(
    "avatar is null or undefined for new user",
    profile.avatar === null || profile.avatar === undefined,
  );
}
