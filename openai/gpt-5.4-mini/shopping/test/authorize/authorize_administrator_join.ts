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
 * Creates a valid administrator join request and delegates to the generated SDK
 * join endpoint. The returned authorized payload includes the issued token pair
 * and the authenticated administrator identity.
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
