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
 * Test successful member login authentication with valid credentials.
 *
 * This test validates the primary authentication workflow:
 * 1. Create a member account with valid credentials
 * 2. Login with the same credentials
 * 3. Verify response contains proper JWT tokens and member profile
 * 4. Verify access token is properly configured for authenticated requests
 */
export async function test_api_member_login_with_valid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // Generate test credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const displayName = RandomGenerator.name(1);
  // 1. Create member account via join endpoint
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email,
      password,
      display_name: displayName,
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Login with the SAME credentials used for registration
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_member_login(loginConnection, {
    body: {
      email,
      password, // Use the same password from registration
    } satisfies IDiscussionBoardMember.ILogin,
  });
  typia.assert(loginResult);
  // 3. Verify JWT token structure
  TestValidator.predicate(
    "has access token",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has expired_at timestamp",
    loginResult.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "has refreshable_until timestamp",
    loginResult.token.refreshable_until.length > 0,
  );
  // 4. Verify member profile information
  TestValidator.predicate(
    "member ID is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      loginResult.id,
    ),
  );
  TestValidator.equals("email matches registration", loginResult.email, email);
  TestValidator.predicate(
    "has display name",
    loginResult.displayName.length > 0,
  );
  TestValidator.equals("ban status is active", loginResult.banStatus, "active");
  TestValidator.predicate(
    "has created_at timestamp",
    loginResult.createdAt.length > 0,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    loginResult.updatedAt.length > 0,
  );
  // 5. Verify tokens match between join and login responses
  TestValidator.predicate(
    "access token differs from join",
    loginResult.token.access !== joinResult.token.access,
  );
  TestValidator.predicate(
    "refresh token differs from join",
    loginResult.token.refresh !== joinResult.token.refresh,
  );
}