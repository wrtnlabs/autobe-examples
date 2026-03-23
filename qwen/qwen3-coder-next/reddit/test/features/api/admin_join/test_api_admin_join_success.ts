import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_join_success(connection: api.IConnection) {
  // Generate unique credentials for admin registration
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    displayName: RandomGenerator.name(),
  } satisfies IRedditLikeAdmin.IJoin;
  // Create admin account using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const output = typia.assert<IRedditLikeAdmin.IAuthorized>(
    await authorize_admin_join(adminConnection, {
      body: joinInput,
    }),
  );
  // Validate response structure matches IAuthorized type (id + token only)
  typia.assert<string & tags.Format<"uuid">>(output.id);
  // Validate JWT token structure
  TestValidator.predicate(
    "access token exists",
    output.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    output.token.refresh.length > 0,
  );
  // Validate token expiration timestamps
  const now = new Date().getTime();
  const accessExpiredAt = new Date(output.token.expired_at).getTime();
  const refreshableUntil = new Date(output.token.refreshable_until).getTime();
  TestValidator.predicate("access token not expired", accessExpiredAt > now);
  TestValidator.predicate("refresh token not expired", refreshableUntil > now);
  TestValidator.predicate(
    "access expires before refresh",
    accessExpiredAt < refreshableUntil,
  );
  // Validate token structure with typia for all fields
  typia.assert<IAuthorizationToken>(output.token);
}
