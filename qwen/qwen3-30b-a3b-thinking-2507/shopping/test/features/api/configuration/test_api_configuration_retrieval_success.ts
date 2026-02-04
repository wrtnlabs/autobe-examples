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

export async function test_api_configuration_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create new connection for admin operations
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, { body: {} });
  // Generate random valid UUID
  const configurationId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve valid configuration
  const configuration =
    await api.functional.shoppingMall.admin.configurations.at(adminConnection, {
      configurationId,
    });
  // Validate configuration with typia
  typia.assert(configuration);
  // Validate actual values by comparing to random values
  const randomTrending = typia.random<number>();
  const randomTotalSales = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  const randomTotalProducts = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  const randomTotalCustomers = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  // Validate each field with proper random values
  TestValidator.equals(
    "trending products count matches random value",
    configuration.trendingProducts,
    randomTrending,
  );
  TestValidator.equals(
    "total sales value matches random value",
    configuration.totalSales,
    randomTotalSales,
  );
  TestValidator.equals(
    "total products count matches random value",
    configuration.totalProducts,
    randomTotalProducts,
  );
  TestValidator.equals(
    "total customers count matches random value",
    configuration.totalCustomers,
    randomTotalCustomers,
  );
}
