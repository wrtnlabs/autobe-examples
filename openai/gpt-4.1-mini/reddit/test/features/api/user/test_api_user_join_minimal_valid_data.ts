import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_join_minimal_valid_data(
  connection: api.IConnection,
): Promise<void> {
  // This test registers a new user with the minimal valid data through the user join endpoint.
  // It expects the operation to succeed and to return authorization tokens.
  const userConnection: api.IConnection = { host: connection.host };
  // Since ICommunityPlatformUser.IJoin is an empty type (no properties defined), we pass empty object.
  const authorized = await authorize_user_join(userConnection, { body: {} });
  typia.assert(authorized);
  // The access token should be set on userConnection.headers for use in further API calls.
  if (!userConnection.headers) userConnection.headers = {};
  userConnection.headers.Authorization = authorized.token.access;
  // Validate token properties exist and are well-formed strings.
  typia.assert(authorized.token.access);
  typia.assert(authorized.token.refresh);
  typia.assert(authorized.token.expired_at);
  typia.assert(authorized.token.refreshable_until);
}
