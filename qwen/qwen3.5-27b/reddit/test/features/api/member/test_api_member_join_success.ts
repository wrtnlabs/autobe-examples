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
 * Test successful member registration with valid credentials.
 *
 * Validates the complete member registration workflow including account creation, authentication token generation, and profile initialization. Ensures that new members receive proper authentication credentials and can immediately access authenticated features.
 *
 * Special attention is given to verifying that the authorization tokens are correctly issued and that the member profile is properly initialized with default values.
 *
 * 1. Create a new member-specific connection from the base connection
 * 2. Call authorize_member_join utility function with valid credentials
 * 3. Verify the response contains IAuthorized structure with all required fields
 * 4. Validate that deleted_at is null (account is active)
 * 5. Verify profile fields are properly initialized (karma = 0, bio/avatar = null)
 * 6. Confirm access token is set in connection headers for subsequent requests
 */
export async function test_api_member_join_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // 2. Register new member with valid credentials
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Validate response structure
  typia.assert(member);
  // 4. Verify account is active (deleted_at is null)
  TestValidator.equals("account is active", member.deleted_at, null);
  // 5. Verify profile initialization
  TestValidator.equals("karma is zero", member.karma, 0);
  TestValidator.equals("bio is null", member.bio, null);
  TestValidator.equals("avatar is null", member.avatar, null);
  TestValidator.predicate("has display_name", member.display_name.length > 0);
  // 6. Verify token structure
  TestValidator.predicate("has access token", member.token.access.length > 0);
  TestValidator.predicate("has refresh token", member.token.refresh.length > 0);
  TestValidator.predicate("has expired_at", member.token.expired_at.length > 0);
  TestValidator.predicate(
    "has refreshable_until",
    member.token.refreshable_until.length > 0,
  );
  // 7. Verify connection headers were updated with access token
  TestValidator.predicate(
    "access token in headers",
    memberConnection.headers?.Authorization !== undefined,
  );
}
