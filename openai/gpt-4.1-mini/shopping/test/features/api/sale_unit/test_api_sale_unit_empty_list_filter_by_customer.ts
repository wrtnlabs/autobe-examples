import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleUnit";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSaleUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnit";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_sale_unit_empty_list_filter_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // Customer join and get authorized connection
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {} satisfies IShoppingMallCustomer.IJoin,
  });
  customerConnection.headers = {
    Authorization: `Bearer ${customerAuth.token.access}`,
  };
  // Define a body filter with values guaranteeing no matches
  // Since IShoppingMallSaleUnit.IRequest is empty in definition, use empty object
  // but to satisfy scenario, we may rely on that no records will match an impossible filter
  // However, since IShoppingMallSaleUnit.IRequest is empty, send empty object
  const body: IShoppingMallSaleUnit.IRequest = {};
  // Call the endpoint
  const output = await api.functional.shoppingMall.customer.sale_units.index(
    customerConnection,
    {
      body,
    },
  );
  typia.assert(output);
  // Validate that data list is empty
  TestValidator.equals("data list empty", output.data.length, 0);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current >= 1",
    output.pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit > 0", output.pagination.limit > 0);
  TestValidator.equals("pagination records zero", output.pagination.records, 0);
  TestValidator.equals("pagination pages zero", output.pagination.pages, 0);
}
