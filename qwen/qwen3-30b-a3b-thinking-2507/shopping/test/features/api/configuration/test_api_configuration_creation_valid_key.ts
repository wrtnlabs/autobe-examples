import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_shopping_mall_admin_configurations_create } from "../../../generate/generate_random_shopping_mall_admin_configurations_create";
import { prepare_random_shopping_mall_configuration } from "../../../prepare/prepare_random_shopping_mall_configuration";

export async function test_api_configuration_creation_valid_key(
  connection: api.IConnection,
) {
  // Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: { email: "admin@example.com", password: "password123" },
  });
  // Create configuration with valid key
  const configuration =
    await generate_random_shopping_mall_admin_configurations_create(
      adminConnection,
      {
        body: {
          key: "shopping-mall-config-123",
          value: "some-value-123",
        },
      },
    );
  // Validate configuration creation
  typia.assert(configuration);
  // Validate that totalSales exists (a property defined in the IShoppingMallConfiguration response)
  TestValidator.predicate(
    "totalSales should be a meaningful numeric value",
    typeof configuration.totalSales === "number",
  );
}
