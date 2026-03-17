import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_owner_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate unique test credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const nickname = "Community Owner";
  // Create owner-specific connection
  const ownerConnection: api.IConnection = { host: connection.host };
  // Execute owner join with valid credentials
  const response = await authorize_owner_join(ownerConnection, {
    body: {
      email,
      password,
      nickname,
    } satisfies IRedditLikeOwner.IJoin,
  });
  // Complete type validation of response
  typia.assert(response);
  // Validate response fields match input (business logic validation)
  TestValidator.equals("email matches input", response.email, email);
  TestValidator.equals(
    "display_name matches nickname",
    response.display_name,
    nickname,
  );
  TestValidator.predicate("is_active is true", response.is_active === true);
  TestValidator.equals(
    "deleted_at is null for active account",
    response.deleted_at,
    null,
  );
  // Verify connection was authorized with access token
  TestValidator.predicate(
    "Authorization header is set",
    (() => {
      const authHeader = ownerConnection.headers?.Authorization;
      return authHeader === response.token.access;
    })(),
  );
}
