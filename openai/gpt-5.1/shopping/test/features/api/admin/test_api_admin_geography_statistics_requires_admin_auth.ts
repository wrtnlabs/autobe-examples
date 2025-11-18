import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallGeographyStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGeographyStatistics";
import type { IShoppingMallGeographyStatisticsPaymentMethodShare } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGeographyStatisticsPaymentMethodShare";
import type { IShoppingMallGeographyStatisticsRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGeographyStatisticsRegion";

export async function test_api_admin_geography_statistics_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1. Unauthenticated access should fail
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated access to geography statistics should fail",
    async () => {
      await api.functional.shoppingMall.admin.statistics.geography.index(
        unauthConnection,
      );
    },
  );

  // 2. Create an admin via join and obtain authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 3. Authorized admin access should succeed and return valid statistics
  const statistics: IShoppingMallGeographyStatistics =
    await api.functional.shoppingMall.admin.statistics.geography.index(
      connection,
    );
  typia.assert<IShoppingMallGeographyStatistics>(statistics);

  // Optional light logical assertion: regions should be an array (already
  // guaranteed by typia.assert, but we can assert basic business expectation
  // like non-nullity).
  TestValidator.predicate(
    "geography statistics regions is a defined array",
    Array.isArray(statistics.regions),
  );
}
