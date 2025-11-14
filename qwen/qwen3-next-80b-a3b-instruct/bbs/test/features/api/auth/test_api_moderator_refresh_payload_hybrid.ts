import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_refresh_payload_hybrid(
  connection: api.IConnection,
) {
  // Generate a valid refresh token
  const refreshToken = typia.random<string & tags.Format<"uuid">>();

  // Create request payload with ONLY the refresh_token field (as required by schema)
  // Extraneous fields cannot be tested as they would cause compilation errors
  const requestBody = {
    refresh_token: refreshToken,
  } satisfies IPoliticalForumModerator.IRefresh;

  // Call the refresh endpoint with only the required field
  const response: IPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(connection, {
      body: requestBody,
    });

  // Validate response contains the expected properties
  typia.assert(response);

  // Verify that the response contains the token structure
  TestValidator.predicate("response has access token", () =>
    Boolean(response.token?.access),
  );
  TestValidator.predicate("response has refresh token", () =>
    Boolean(response.token?.refresh),
  );
  TestValidator.predicate("response has expired_at", () =>
    Boolean(response.token?.expired_at),
  );
  TestValidator.predicate("response has refreshable_until", () =>
    Boolean(response.token?.refreshable_until),
  );

  // Verify the moderator's identity is preserved in response
  TestValidator.predicate("moderator has UUID id", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      response.id,
    ),
  );
  TestValidator.predicate("moderator has valid email", () =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(response.email),
  );
}
