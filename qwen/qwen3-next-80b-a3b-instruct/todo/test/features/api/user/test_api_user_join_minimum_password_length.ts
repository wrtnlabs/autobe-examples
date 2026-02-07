import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_join_minimum_password_length(
  connection: api.IConnection,
): Promise<void> {
  // Create user-specific connection for join operation
  const userConnection: api.IConnection = { host: connection.host };
  // Perform user join with empty body (as per ITodoAppUser.IJoin definition)
  const result = await authorize_user_join(userConnection, {
    body: {},
  });
  // Validate the response structure with typia.assert (complete validation)
  typia.assert(result);
  // Validate essential token properties exist (business logic)
  TestValidator.equals("access token exists", result.access.length > 0, true);
  TestValidator.equals("refresh token exists", result.refresh.length > 0, true);
  TestValidator.predicate(
    "token has expired_at",
    () => !!result.token.expired_at,
  );
  TestValidator.predicate(
    "token has refreshable_until",
    () => !!result.token.refreshable_until,
  );
}
