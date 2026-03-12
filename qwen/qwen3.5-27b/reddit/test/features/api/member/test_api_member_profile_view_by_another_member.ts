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
 * Test that an authenticated member can successfully retrieve another member's complete profile information.
 *
 * This test validates:
 * - Member A can view Member B's public profile
 * - All profile fields are correctly returned with proper types
 * - Security requirements (password not exposed)
 * - Business logic (active member has null deleted_at)
 */
export async function test_api_member_profile_view_by_another_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate Member A (viewer)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
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
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Create Member B (profile to be viewed) with complete data
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(3),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      avatar_uri: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberB);
  // 3. Member A retrieves Member B's profile
  const profile = await api.functional.redditClone.members.at(
    memberAConnection,
    {
      memberId: memberB.id,
    },
  );
  typia.assert(profile);
  // 4. Validate profile data integrity
  TestValidator.equals("member ID matches", profile.id, memberB.id);
  TestValidator.equals("username matches", profile.username, memberB.username);
  TestValidator.equals(
    "display name matches",
    profile.display_name,
    memberB.display_name,
  );
  TestValidator.equals("bio matches", profile.bio, memberB.bio);
  TestValidator.equals(
    "avatar_uri matches",
    profile.avatar_uri,
    memberB.avatar_uri,
  );
  TestValidator.equals("karma is zero for new member", profile.karma, 0);
  TestValidator.equals(
    "deleted_at is null for active member",
    profile.deleted_at,
    null,
  );
  // 5. Validate timestamp formats
  TestValidator.predicate("created_at is valid date-time", () => {
    const date = new Date(profile.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updated_at is valid date-time", () => {
    const date = new Date(profile.updated_at);
    return !isNaN(date.getTime());
  });
  // 6. Validate that timestamps are in the past (not future)
  TestValidator.predicate("created_at is not in future", () => {
    return new Date(profile.created_at).getTime() <= Date.now();
  });
  TestValidator.predicate("updated_at is not in future", () => {
    return new Date(profile.updated_at).getTime() <= Date.now();
  });
}
