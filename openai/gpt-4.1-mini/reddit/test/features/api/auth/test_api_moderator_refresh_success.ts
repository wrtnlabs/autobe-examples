import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Moderator account creation (join) and initial authorization
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const joinOutput = await authorize_moderator_join(moderatorJoinConnection, {
    body: {},
  });
  typia.assert(joinOutput);
  // Use the same connection (with updated auth headers) to perform token refresh
  const refreshOutput = await authorize_moderator_refresh(
    moderatorJoinConnection,
    {
      body: {},
    },
  );
  typia.assert(refreshOutput);
  // Validate that new access and refresh tokens are returned
  TestValidator.predicate(
    "new access token exists",
    typeof refreshOutput.token.access === "string" &&
      refreshOutput.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token exists",
    typeof refreshOutput.token.refresh === "string" &&
      refreshOutput.token.refresh.length > 0,
  );
  // Validate that the new refresh token is different from the old one (old invalidated)
  TestValidator.notEquals(
    "refresh token rotated",
    refreshOutput.token.refresh,
    joinOutput.token.refresh,
  );
  // Validate that token expiration timestamps are valid ISO 8601 strings
  const iso8601Regex =
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])[T\s]([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.\d+)?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/;
  TestValidator.predicate(
    "access token expired_at is valid ISO 8601",
    iso8601Regex.test(refreshOutput.token.expired_at),
  );
  TestValidator.predicate(
    "refresh token refreshable_until is valid ISO 8601",
    iso8601Regex.test(refreshOutput.token.refreshable_until),
  );
}
