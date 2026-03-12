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
 * Test successful member registration with optional profile fields.
 *
 * This test validates that a new member can register with all optional profile
 * fields (display_name, bio, avatar_uri) and that these fields are correctly
 * stored and returned in the authentication response.
 */
export async function test_api_member_registration_with_optional_profile_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // 2. Prepare registration data with all optional fields
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const username = RandomGenerator.alphabets(8);
  const displayName = RandomGenerator.name(2);
  const bio = RandomGenerator.paragraph({ sentences: 3 });
  const avatarUri = typia.random<string & tags.Format<"uri">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // 3. Register member with optional profile fields using utility function
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: email,
      password: password,
      username: username,
      display_name: displayName,
      bio: bio,
      avatar_uri: avatarUri,
      href: href,
      referrer: referrer,
      ip: ip,
    } satisfies IRedditCloneMember.IJoin,
  });
  // 4. Validate response type with typia
  typia.assert(member);
  // 5. Validate business logic
  TestValidator.equals("email matches input", member.email, email);
  TestValidator.equals("username matches input", member.username, username);
  TestValidator.equals(
    "display_name matches custom value",
    member.display_name,
    displayName,
  );
  TestValidator.equals("bio matches input", member.bio, bio);
  TestValidator.equals(
    "avatar_uri matches input",
    member.avatar_uri,
    avatarUri,
  );
  TestValidator.equals("karma initialized to zero", member.karma, 0);
  TestValidator.equals("deleted_at is null", member.deleted_at, null);
  TestValidator.predicate("has access token", member.token.access.length > 0);
  TestValidator.predicate("has refresh token", member.token.refresh.length > 0);
  TestValidator.predicate(
    "has valid expired_at",
    member.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "has valid refreshable_until",
    member.token.refreshable_until.length > 0,
  );
}
