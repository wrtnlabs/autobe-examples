import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_registration_successful(
  connection: api.IConnection,
): Promise<void> {
  // Generate random email for testing
  const email = typia.random<string & tags.Format<"email">>();
  // Create user with valid email and password
  const user = await authorize_user_join(connection, {
    body: {
      email,
      password: "ValidPass1!", // Password meets complexity requirements
    },
  });
  // Validate response structure
  typia.assert(user);
  // Verify token properties
  TestValidator.equals("access token exists", !!user.token.access, true);
  TestValidator.equals("refresh token exists", !!user.token.refresh, true);
  TestValidator.predicate(
    "access token has reasonable length",
    user.token.access.length > 20,
  );
  TestValidator.predicate(
    "refresh token has reasonable length",
    user.token.refresh.length > 20,
  );
}
