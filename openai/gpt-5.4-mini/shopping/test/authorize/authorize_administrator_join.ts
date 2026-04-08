import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate a new administrator for E2E testing.
 *
 * Delegates to the mall platform administrator join API using the provided
 * request body, then returns the authorized administrator payload including
 * issued tokens.
 *
 * The underlying SDK function also mutates the connection authorization header
 * with the access token, so this utility preserves the full authentication flow
 * required by subsequent authenticated requests.
 */
export async function authorize_administrator_join(
  connection: api.IConnection,
  props: {
    body: IMallPlatformAdministrator.IJoin;
  },
): Promise<IMallPlatformAdministrator.IAuthorized> {
  return await api.functional.mallPlatform.auth.administrator.join(connection, {
    body: props.body,
  });
}
