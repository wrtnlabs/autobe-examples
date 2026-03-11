import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test successful administrator login with valid email and password credentials.
 * This scenario validates that an existing administrator can authenticate and receive JWT tokens.
 * First, create an administrator account through the join endpoint to establish valid credentials.
 * Then perform login with the same credentials and verify:
 * 1. Response includes valid authorization tokens (access and refresh)
 * 2. Tokens have proper expiration timestamps
 * 3. Response contains correct administrator identity information (id, email, admin_grade)
 * 4. The admin_grade matches the registration value.
 * Validate that the access token can be used for subsequent authorized API calls by checking token structure and expiration times.
 * This tests the primary success path for administrator authentication.
 */
export async function test_api_admin_login_success_with_valid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for the test
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate credentials before join
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  
  // Step 1: Create an admin account using join endpoint (use utility function)
  const joinResult = await authorize_admin_join(adminConnection, {
    body: {
      email: email,
      password: password,
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(joinResult);
  // Extract credentials from stored values
  const credentials = {
    email: email,
    password: password,
  } satisfies IDiscussionBoardAdmin.ILogin;
  // Step 2: Create a new connection for login test
  const loginConnection: api.IConnection = { host: connection.host };
  // Step 3: Perform login with the created credentials (use utility function)
  const loginResult = await authorize_admin_login(loginConnection, {
    body: credentials,
  });
  typia.assert(loginResult);
  // Step 4: Validate token structure
  TestValidator.predicate(
    "access token exists and is not empty",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists and is not empty",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      loginResult.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refreshable_until is valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      loginResult.token.refreshable_until,
    ),
  );
  // Step 5: Validate administrator identity information
  TestValidator.equals(
    "email matches login credentials",
    loginResult.email,
    credentials.email,
  );
  TestValidator.equals(
    "admin_grade is regular",
    loginResult.admin_grade,
    "regular",
  );
  TestValidator.predicate(
    "id is valid UUID",
    /^[0-9a-f-]{36}$/i.test(loginResult.id),
  );
  TestValidator.predicate(
    "created_at is valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      loginResult.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      loginResult.updated_at,
    ),
  );
  // Step 6: Validate timestamps are in correct order
  const expiredAt = new Date(loginResult.token.expired_at).getTime();
  const refreshableUntil = new Date(
    loginResult.token.refreshable_until,
  ).getTime();
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntil > expiredAt,
  );
  // Step 7: Validate deleted_at is null for active account
  TestValidator.equals(
    "deleted_at is null for active account",
    loginResult.deleted_at,
    null,
  );
}