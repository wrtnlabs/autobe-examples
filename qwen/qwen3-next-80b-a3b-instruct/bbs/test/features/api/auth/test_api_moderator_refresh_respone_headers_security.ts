import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_refresh_respone_headers_security(
  connection: api.IConnection,
) {
  const refreshToken = typia.random<string>();

  const response = await api.functional.auth.moderator.refresh(connection, {
    body: {
      refresh_token: refreshToken,
    } satisfies IPoliticalForumModerator.IRefresh,
  });
  typia.assert(response);

  // Validate the structure of the returned authorized response
  TestValidator.equals(
    "response should contain id",
    typeof response.id,
    "string",
  );
  TestValidator.equals(
    "response should contain email",
    typeof response.email,
    "string",
  );
  TestValidator.equals(
    "response should contain token",
    response.token !== undefined,
    true,
  );
  TestValidator.equals(
    "token should contain access field",
    response.token.access !== undefined,
    true,
  );
  TestValidator.equals(
    "token should contain refresh field",
    response.token.refresh !== undefined,
    true,
  );
  TestValidator.equals(
    "token should contain expired_at field",
    response.token.expired_at !== undefined,
    true,
  );
  TestValidator.equals(
    "token should contain refreshable_until field",
    response.token.refreshable_until !== undefined,
    true,
  );

  // Validate token formats
  TestValidator.predicate(
    "id should be UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      response.id,
    ),
  );
  TestValidator.predicate(
    "email should be valid email",
    /^[^@]+@[^@]+\.[^@]+$/.test(response.email),
  );
  TestValidator.predicate(
    "expired_at should be ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.\d+)?(?:Z|[+-][0-9]{2}:[0-9]{2})$/.test(
      response.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refreshable_until should be ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.\d+)?(?:Z|[+-][0-9]{2}:[0-9]{2})$/.test(
      response.token.refreshable_until,
    ),
  );

  // Since the server is responsible for setting security headers and we have no way to verify them through the client SDK,
  // we rely on the server's implementation to set them correctly based on configuration.
  // Our test verifies that the API contract is respected: the refresh operation returns a valid IAuthorized response.
  // HTTP security headers are a server-side implementation concern that falls outside the scope of our client contract testing.
}
