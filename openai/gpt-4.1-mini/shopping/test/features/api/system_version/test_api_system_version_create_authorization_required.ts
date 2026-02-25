import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallSystemVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemVersion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_system_versions_create } from "../../../generate/generate_random_shopping_mall_administrator_system_versions_create";
import { prepare_random_shopping_mall_system_version } from "../../../prepare/prepare_random_shopping_mall_system_version";

export async function test_api_system_version_create_authorization_required(
  connection: api.IConnection,
): Promise<void> {
  // Actor connection WITHOUT authorizing administrator role
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  // Prepare request body data (random valid system version create payload)
  const body = typia.random<IShoppingMallSystemVersion.ICreate>();
  // Attempt to create system version record WITHOUT admin authorization
  // Expect the call to reject with HTTP status 401 or 403
  await TestValidator.httpError(
    "should reject system version creation if unauthorized",
    [401, 403],
    async () => {
      await generate_random_shopping_mall_administrator_system_versions_create(
        unauthorizedConnection,
        { body },
      );
    },
  );
}
