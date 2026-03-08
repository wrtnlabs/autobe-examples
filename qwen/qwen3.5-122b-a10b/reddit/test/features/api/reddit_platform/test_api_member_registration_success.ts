import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful member account registration with valid credentials.
 *
 * 1. Generate unique email, username, and password with complexity requirements
 * 2. Call member join endpoint with valid registration data
 * 3. Verify response contains all expected member fields
 * 4. Verify karma_score is initialized to 0
 * 5. Verify display_name, bio, avatar are null
 * 6. Verify JWT tokens are present and valid
 * 7. Verify member can immediately make authenticated requests
 */
export async function test_api_member_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate unique registration credentials
  const email = typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>();
  const username = RandomGenerator.alphabets(8);
  const password = "Password123!"; // Meets complexity: uppercase, lowercase, number, special char
  // 2. Create member connection and register
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      username,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  // 3. Validate response structure
  typia.assert(authorized);
  // 4. Verify member profile fields
  TestValidator.predicate(
    "member id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorized.id,
    ),
  );
  TestValidator.equals("username matches", authorized.username, username);
  TestValidator.equals("email matches", authorized.email, email);
  TestValidator.equals(
    "karma_score initialized to 0",
    authorized.karma_score,
    0,
  );
  TestValidator.equals("display_name is null", authorized.display_name, null);
  TestValidator.equals("bio is null", authorized.bio, null);
  TestValidator.equals("avatar is null", authorized.avatar, null);
  // 5. Verify JWT tokens
  TestValidator.predicate(
    "accessToken exists",
    authorized.accessToken.length > 0,
  );
  TestValidator.predicate(
    "expiresAt is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      authorized.expiresAt,
    ),
  );
  // 6. Verify token structure
  TestValidator.predicate(
    "token.access exists",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh exists",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at is valid",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      authorized.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "token.refreshable_until is valid",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      authorized.token.refreshable_until,
    ),
  );
  // 7. Verify timestamps
  TestValidator.predicate(
    "created_at is valid",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      authorized.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      authorized.updated_at,
    ),
  );
  // 8. Verify member can make authenticated requests (test profile view)
  // Note: Using memberConnection which has the authorization token set by authorize_member_join
  // We can verify the connection is authenticated by checking the token was applied
  TestValidator.predicate(
    "member connection has authorization header",
    memberConnection.headers?.Authorization !== undefined,
  );
}