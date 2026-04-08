import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test profile retrieval with null bio and avatar fields.
 *
 * Validates that a member profile can be successfully retrieved when the bio and avatar fields are not set. Creates a member account with minimal profile information, then retrieves their profile to verify the endpoint correctly handles nullable profile fields.
 *
 * The test ensures that required fields like display_name, karma_score, and member summary information (id, username, created_at) are present and correctly populated, while optional fields (bio, avatar) are properly returned as null.
 *
 * 1. Create a member account with randomized credentials.
 * 2. Retrieve the member's profile using their member ID.
 * 3. Verify bio and avatar are null.
 * 4. Verify display_name, karma_score, and member summary fields are present.
 */
export async function test_api_profile_view_with_null_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account with minimal profile information
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Retrieve the member's profile
  const profile = await api.functional.redditLike.profiles.at(connection, {
    memberId: member.id,
  });
  typia.assert(profile);
  // 3. Verify bio and avatar are null
  TestValidator.equals("bio is null", profile.bio, null);
  TestValidator.equals("avatar is null", profile.avatar, null);
  // 4. Verify required fields are present
  TestValidator.equals(
    "display_name exists",
    profile.display_name,
    member.display_name,
  );
  TestValidator.predicate("karma_score is valid", profile.karma_score >= 0);
  // 5. Verify member summary fields
  TestValidator.equals("member id matches", profile.member.id, member.id);
  TestValidator.equals(
    "member username matches",
    profile.member.username,
    member.username,
  );
  TestValidator.equals(
    "member display_name matches",
    profile.member.display_name,
    member.display_name,
  );
  TestValidator.predicate(
    "member created_at exists",
    () => profile.member.created_at.length > 0,
  );
  // 6. Verify member summary also has null bio and avatar
  TestValidator.equals("member bio is null", profile.member.bio, null);
  TestValidator.equals("member avatar is null", profile.member.avatar, null);
}
