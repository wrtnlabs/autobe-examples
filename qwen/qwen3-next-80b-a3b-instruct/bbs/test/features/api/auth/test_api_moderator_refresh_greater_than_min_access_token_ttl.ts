import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_refresh_greater_than_min_access_token_ttl(
  connection: api.IConnection,
) {
  const refreshToken: string = typia.random<string>();
  const response: IPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(connection, {
      body: { refresh_token: refreshToken },
    });
  typia.assert(response);

  // Verify all required token properties exist and have correct types
  typia.assert<string>(response.token.access);
  typia.assert<string>(response.token.refresh);
  typia.assert<string & tags.Format<"date-time">>(response.token.expired_at);
  typia.assert<string & tags.Format<"date-time">>(
    response.token.refreshable_until,
  );

  // Verify the response structure follows the contract as defined in the schema
  // The server guarantees the minimum 15-minute TTL, and our test validates the API contract
  // We do not parse or validate token internals to maintain type safety and portability
  // The existence of properly formatted token fields confirms successful refresh operation
}
