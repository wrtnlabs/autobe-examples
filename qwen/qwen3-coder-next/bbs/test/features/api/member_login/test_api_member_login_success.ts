import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
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
 * Test successful member login with valid credentials.
 * 1. Create a member account using authorize_member_join
 * 2. Store password from creation
 * 3. Login with the created member's credentials using authorize_member_login
 * 4. Validate the response includes JWT tokens and member profile
 * 5. Verify token structure and member properties
 */
export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member account
  const password = RandomGenerator.alphaNumeric(16);
  const createdMember = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: password,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(createdMember);
  // Step 2: Login with the created member's credentials
  const loginResponse = await authorize_member_login(connection, {
    body: {
      email: createdMember.email,
      password: password,
    },
  });
  typia.assert(loginResponse);
  // Step 3: Validate response structure
  TestValidator.equals(
    "member email matches",
    loginResponse.email,
    createdMember.email,
  );
  TestValidator.equals(
    "display name matches",
    loginResponse.display_name,
    createdMember.display_name,
  );
  TestValidator.equals("bio matches", loginResponse.bio, createdMember.bio);
  // Step 4: Validate token structure
  TestValidator.predicate(
    "has access token",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    loginResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has expiration timestamp",
    new Date(loginResponse.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "has refreshable_until timestamp",
    new Date(loginResponse.token.refreshable_until) > new Date(),
  );
  TestValidator.predicate(
    "access token expires before refreshable_until",
    new Date(loginResponse.token.expired_at) <=
      new Date(loginResponse.token.refreshable_until),
  );
  // Step 5: Validate member properties
  TestValidator.equals("role is member", loginResponse.role, "member");
  TestValidator.equals("is_banned is false", loginResponse.is_banned, false);
  TestValidator.equals("ban_reason is null", loginResponse.ban_reason, null);
}
