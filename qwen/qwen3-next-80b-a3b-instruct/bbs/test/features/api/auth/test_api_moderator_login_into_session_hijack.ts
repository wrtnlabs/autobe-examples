import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_login_into_session_hijack(
  connection: api.IConnection,
) {
  // Step 1: Authenticate moderator to obtain valid access and refresh tokens
  const authResponse: IPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: typia.random<IPoliticalForumModerator.ILogin>(),
    });
  typia.assert(authResponse);

  // Validate that the response contains all required fields with correct types
  TestValidator.equals(
    "response should contain moderator id",
    typeof authResponse.id,
    "string",
  );
  TestValidator.predicate(
    "moderator id should be valid UUID",
    /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(
      authResponse.id,
    ),
  );
  TestValidator.equals(
    "response should contain moderator email",
    typeof authResponse.email,
    "string",
  );
  TestValidator.predicate(
    "moderator email should be valid",
    /^\S+@\S+\.\S+$/.test(authResponse.email),
  );

  // Validate token structure - it should contain the expected token properties
  const token: IAuthorizationToken = authResponse.token;
  TestValidator.equals(
    "token should have access property",
    typeof token.access,
    "string",
  );
  TestValidator.equals(
    "token should have refresh property",
    typeof token.refresh,
    "string",
  );
  TestValidator.equals(
    "token should have expired_at property",
    typeof token.expired_at,
    "string",
  );
  TestValidator.predicate(
    "expired_at should be ISO date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      token.expired_at,
    ),
  );
  TestValidator.equals(
    "token should have refreshable_until property",
    typeof token.refreshable_until,
    "string",
  );
  TestValidator.predicate(
    "refreshable_until should be ISO date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      token.refreshable_until,
    ),
  );

  // The scenario requested testing access token as refresh token
  // However, the refresh endpoint does not exist in the provided API functions
  // Therefore, we cannot implement the session hijack test as requested
  // We have validated the correct login response structure instead
}
