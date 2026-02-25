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

export async function test_api_user_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // Generate random valid user data
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppUser.IJoin;
  // Call the join endpoint using utility function (required by priority rules)
  const response: ITodoAppUser.IAuthorized = await authorize_user_join(
    userConnection,
    {
      body: joinInput,
    },
  );
  // Validate the response structure using typia - this performs complete validation
  typia.assert(response);
  // Validate specific business logic (not type validation)
  TestValidator.equals("email matches input", response.email, joinInput.email);
  TestValidator.equals(
    "display name matches input",
    response.display_name,
    joinInput.display_name,
  );
  TestValidator.equals("deleted_at is null", response.deleted_at, null);
  // Token fields are validated by typia.assert, but we can check business logic
  TestValidator.predicate(
    "access token is non-empty",
    response.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    response.token.refresh.length > 0,
  );
}
