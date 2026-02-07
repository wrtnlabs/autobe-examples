import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_system_config_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for testing
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdmin.IJoin,
  });
  // 2. Test default pagination (page=1, limit=10)
  const defaultResponse =
    await api.functional.ecommerce.admin.system_configs.index(adminConnection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IEcommerceSystemConfig.IRequest,
    });
  typia.assert(defaultResponse);
  // 3. Test alternative pagination (page=2, limit=5)
  const alternativeResponse =
    await api.functional.ecommerce.admin.system_configs.index(adminConnection, {
      body: {
        page: 2,
        limit: 5,
      } satisfies IEcommerceSystemConfig.IRequest,
    });
  typia.assert(alternativeResponse);
}
