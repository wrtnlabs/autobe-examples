import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
import { TestValidator } from "@nestia/e2e";
import typia from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";

export async function test_api_password_reset_search_filtered_roles_token_pagination(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const joinBody: IShoppingMallCustomer.IJoin = {};
  const authorized = await authorize_customer_join(customerConnection, {
    body: joinBody,
  });
  customerConnection.headers = { Authorization: authorized.token.access };
  const tokenSubstring = authorized.token.refresh.slice(0, 8);
  const body: IShoppingMallCustomerPasswordReset.IRequest = {
    roles: ["customer", "seller"],
    token: tokenSubstring,
    expired: false,
    page: 1,
    limit: 10,
  } as any;
  const page = await api.functional.shoppingMall.customer.password_resets.index(
    customerConnection,
    { body },
  );
  typia.assert(page);
  TestValidator.predicate("valid current page", page.pagination.current === 1);
  TestValidator.predicate("valid limit", page.pagination.limit === 10);
  TestValidator.predicate("valid records count", page.pagination.records >= 0);
  TestValidator.predicate("valid pages count", page.pagination.pages >= 0);
  for (const tokenInfo of page.data) {
    typia.assert(tokenInfo);
  }
}
