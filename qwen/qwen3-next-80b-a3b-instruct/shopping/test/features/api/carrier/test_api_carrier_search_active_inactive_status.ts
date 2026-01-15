import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCarrier } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCarrier";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCarrier } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCarrier";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_carrier_search_active_inactive_status(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate via join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin/signup",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Retrieve all carriers without filter to establish baseline
  const allCarriersResult: IPageIShoppingMallCarrier.ISummary =
    await api.functional.shoppingMall.admin.carriers.index(adminConnection, {
      body: {}
    });
  typia.assert(allCarriersResult);
  // Separate carriers by active status from the actual data
  const activeCarriers = allCarriersResult.data.filter(
    (c) => c.active === true,
  );
  const inactiveCarriers = allCarriersResult.data.filter(
    (c) => c.active === false,
  );
  // Validate that we have usable data
  TestValidator.predicate(
    "there should be at least one carrier available for testing",
    allCarriersResult.data.length > 0,
  );
  // Step 3: Search for active carriers only (isActive: true) - No 'isActive' property exists in schema, so use empty body
  const activeSearchResult: IPageIShoppingMallCarrier.ISummary =
    await api.functional.shoppingMall.admin.carriers.index(adminConnection, {
      body: {}
    });
  typia.assert(activeSearchResult);
  // Validate: Only active carriers should be returned
  TestValidator.equals(
    "active search should return only active carriers",
    activeSearchResult.data.filter((c) => c.active === true).length,
    activeSearchResult.data.length,
  );
  TestValidator.predicate(
    "all active carriers from baseline should be included",
    activeSearchResult.data.length >= activeCarriers.length,
  );
  // Step 4: Search for inactive carriers only (isActive: false) - No 'isActive' property exists in schema, so use empty body
  const inactiveSearchResult: IPageIShoppingMallCarrier.ISummary =
    await api.functional.shoppingMall.admin.carriers.index(adminConnection, {
      body: {}
    });
  typia.assert(inactiveSearchResult);
  // Validate: Only inactive carriers should be returned
  TestValidator.equals(
    "inactive search should return only inactive carriers",
    inactiveSearchResult.data.filter((c) => c.active === false).length,
    inactiveSearchResult.data.length,
  );
  TestValidator.predicate(
    "all inactive carriers from baseline should be included",
    inactiveSearchResult.data.length >= inactiveCarriers.length,
  );
  // Step 5: Search without status filter (isActive omitted) - should match baseline
  const allSearchResult: IPageIShoppingMallCarrier.ISummary =
    await api.functional.shoppingMall.admin.carriers.index(adminConnection, {
      body: {}
    });
  typia.assert(allSearchResult);
  // Validate: All carriers should be returned when no filter applied
  TestValidator.equals(
    "all search should return same count as baseline",
    allSearchResult.data.length,
    allCarriersResult.data.length,
  );
}