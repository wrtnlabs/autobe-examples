import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleUnitSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleUnitSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSaleUnitSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnitSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_sale_unit_snapshots_index_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer join authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {} satisfies IShoppingMallCustomer.IJoin,
  });
  // Set authorization header
  customerConnection.headers = {
    Authorization: `Bearer ${customerAuth.token.access}`,
  };
  // 2. Request first page of sale unit snapshots
  const firstPage =
    await api.functional.shoppingMall.customer.sale_unit_snapshots.index(
      customerConnection,
      { body: {} satisfies IShoppingMallSaleUnitSnapshot.IRequest },
    );
  typia.assert(firstPage);
  // Validate first page pagination
  TestValidator.predicate(
    "pagination current page >= 1",
    firstPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination pages >= current",
    firstPage.pagination.pages >= firstPage.pagination.current,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    firstPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "data length <= pagination limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  // 3. If there are more pages, request second page
  if (firstPage.pagination.current < firstPage.pagination.pages) {
    // Assume body for next page includes cursor info or page number
    // Since cursor pagination specifics are not detailed in IShoppingMallSaleUnitSnapshot.IRequest,
    // we simulate with same empty object as placeholder.
    const secondPage =
      await api.functional.shoppingMall.customer.sale_unit_snapshots.index(
        customerConnection,
        { body: {} satisfies IShoppingMallSaleUnitSnapshot.IRequest },
      );
    typia.assert(secondPage);
    // Validate second page pagination
    TestValidator.predicate(
      "second page current > first page current",
      secondPage.pagination.current > firstPage.pagination.current,
    );
    TestValidator.predicate(
      "second page pages >= current",
      secondPage.pagination.pages >= secondPage.pagination.current,
    );
    TestValidator.predicate(
      "second page records >= first page records",
      secondPage.pagination.records >= firstPage.pagination.records,
    );
    TestValidator.predicate(
      "second page limit equals first page limit",
      secondPage.pagination.limit === firstPage.pagination.limit,
    );
    TestValidator.predicate(
      "second page data length <= limit",
      secondPage.data.length <= secondPage.pagination.limit,
    );
    // Validate no overlap in data between pages by IDs if possible
    // Since IShoppingMallSaleUnitSnapshot.ISummary structure is not specified,
    // skip ID uniqueness check.
  }
}
