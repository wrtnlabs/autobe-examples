import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";

/**
 * Test the successful registration of a new registered user.
 * Validate response includes authorization token with correct JWT structure.
 */
export async function test_api_registered_user_join_successful_registration(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new registered user join connection
  const joinConnection: api.IConnection = { host: connection.host };
  // 2. Use empty object for join body as IJoin properties undefined
  const body = {};
  // 3. Call authorization utility function for join
  const result = await authorize_registered_user_join(joinConnection, { body });
  // 4. Validate response structure
  typia.assert(result);
  // 5. Validate authorization token structure
  typia.assert(result.token);
  TestValidator.predicate(
    "access token is JWT string",
    typeof result.token.access === "string" && result.token.access.length > 20,
  );
  TestValidator.predicate(
    "refresh token is JWT string",
    typeof result.token.refresh === "string" &&
      result.token.refresh.length > 20,
  );
  TestValidator.predicate(
    "expired_at is ISO8601 date-time",
    !isNaN(Date.parse(result.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is ISO8601 date-time",
    !isNaN(Date.parse(result.token.refreshable_until)),
  );
}
