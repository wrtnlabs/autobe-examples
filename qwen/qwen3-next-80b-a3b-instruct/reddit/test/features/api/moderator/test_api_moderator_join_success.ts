import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for the moderator join operation
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Use the authorized utility function to join as a moderator
  const result = await authorize_moderator_join(moderatorConnection, {
    body: {} satisfies ICommunityModerator.IJoin,
  });
  typia.assert(result);
  // Validate the authorization token structure
  const token = result.token;
  // Validate existence and format of token fields per IAuthorizationToken contract
  TestValidator.equals("access token is non-empty", token.access.length > 0, true);
  TestValidator.equals("refresh token is non-empty", token.refresh.length > 0, true);
  // Validate date-time format via typia.assert() and ensure non-null
  // typia.assert already confirms all format="date-time" constraints
  TestValidator.equals(
    "expired_at is ISO 8601 date-time",
    typeof token.expired_at,
    "string",
  );
  TestValidator.equals(
    "refreshable_until is ISO 8601 date-time",
    typeof token.refreshable_until,
    "string",
  );
}