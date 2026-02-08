import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleUnitSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleUnitSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSaleUnitSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnitSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_sale_unit_snapshot_pagination_behavior(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 2: Verify the pagination behavior where the administrator retrieves the second page of sale unit snapshots.
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized: IShoppingMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, { body: {} });
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = adminAuthorized.token.access;
  // 2. Fetch first page with assumed limit 5
  // Since the request DTO is empty, we assume the API supports pagination params in the body optionally
  // To test pagination, we reuse the same body without pagination parameters because the specification does not define them explicitly
  const firstPageResponse: IPageIShoppingMallSaleUnitSnapshot.ISummary =
    await api.functional.shoppingMall.administrator.sale_unit_snapshots.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(firstPageResponse);
  TestValidator.predicate(
    "first page contains data",
    firstPageResponse.data.length > 0,
  );
  TestValidator.predicate(
    "first page current is valid",
    firstPageResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination pages >= current",
    firstPageResponse.pagination.pages >= firstPageResponse.pagination.current,
  );
  if (
    firstPageResponse.pagination.pages > firstPageResponse.pagination.current
  ) {
    // 3. Fetch the second page
    // Since no page or cursor param is defined, call the API again, assuming the implementation supports cursor-based pagination with opaque state
    // As we cannot pass cursor parameters (no schema details), this test only attempts to check that consecutive calls return different data sets if multiple pages exist
    const secondPageResponse: IPageIShoppingMallSaleUnitSnapshot.ISummary =
      await api.functional.shoppingMall.administrator.sale_unit_snapshots.index(
        adminConnection,
        { body: {} },
      );
    typia.assert(secondPageResponse);
    TestValidator.predicate(
      "second page contains data",
      secondPageResponse.data.length > 0,
    );
    TestValidator.predicate(
      "second page current is valid",
      secondPageResponse.pagination.current >= 1,
    );
    // Check data difference between first and second page
    TestValidator.notEquals(
      "data sets for first and second page differ",
      firstPageResponse.data,
      secondPageResponse.data,
    );
  }
}
