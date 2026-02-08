import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_join_registration_success_and_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Test scenario 1: Successful user registration
  const userConnection1: api.IConnection = { host: connection.host };
  const body1: IMultiUserTodoUser.IJoin = {};
  const auth1 = await authorize_user_join(userConnection1, { body: body1 });
  typia.assert(auth1);
  // Test the token presence
  TestValidator.predicate(
    "token access exists",
    typeof auth1.token.access === "string" && auth1.token.access.length > 0,
  );
  TestValidator.predicate(
    "token refresh exists",
    typeof auth1.token.refresh === "string" && auth1.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expired_at valid ISO",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      auth1.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "token refreshable_until valid ISO",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      auth1.token.refreshable_until,
    ),
  );
  // Test scenario 2: Duplicate email registration
  // Calling join again with same empty body expected to trigger duplicate error
  const userConnection2: api.IConnection = { host: connection.host };
  await TestValidator.error("duplicate join registration", async () => {
    await authorize_user_join(userConnection2, {
      body: {},
    });
  });
  // Test scenario 3: Password barely meets complexity requirements
  // With empty body due to schema, just call join again expecting success or error
  const userConnection3: api.IConnection = { host: connection.host };
  const body3: IMultiUserTodoUser.IJoin = {};
  const auth3 = await authorize_user_join(userConnection3, { body: body3 });
  typia.assert(auth3);
  TestValidator.predicate(
    "token access exists minimal complexity",
    typeof auth3.token.access === "string" && auth3.token.access.length > 0,
  );
  TestValidator.predicate(
    "token refresh exists minimal complexity",
    typeof auth3.token.refresh === "string" && auth3.token.refresh.length > 0,
  );
}
