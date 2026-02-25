import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerEmailVerification";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_email_verifications_index_no_records_found(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 3: Edge case where no email verification records match the search criteria.
  // Use filters that are unlikely to find records, such as token substring with random string, or date range with no records.
  // Validate response pagination shows zero records and empty data list.
  // Ensure system handles no-result scenarios gracefully without errors.
  // 1. Customer authorization join
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {},
  });
  customerConnection.headers = { Authorization: authorized.token.access };
  // 2. Build search filter with unlikely token substring and no record date range
  const randomTokenSubstring = RandomGenerator.alphabets(20);
  // Use expiresAtBefore far in the future, and expiresAtAfter far in the past
  // to create a contradictory time range that can't produce results
  const expiresAtBefore = new Date(2100, 0, 1).toISOString(); // Jan 1, 2100
  const expiresAtAfter = new Date(2000, 0, 1).toISOString(); // Jan 1, 2000
  const filterBody: IShoppingMallCustomerEmailVerification.IRequest = {
    token: randomTokenSubstring,
    expiresAtBefore: expiresAtBefore,
    expiresAtAfter: expiresAtAfter,
    page: 1,
    limit: 10,
  };
  // 3. API call to index email_verifications
  const result =
    await api.functional.shoppingMall.customer.email_verifications.index(
      customerConnection,
      { body: filterBody },
    );
  typia.assert(result);
  // 4. Validate response pagination and data
  TestValidator.equals("pagination current page", result.pagination.current, 1);
  TestValidator.equals("pagination limit", result.pagination.limit, 10);
  TestValidator.equals(
    "pagination total records",
    result.pagination.records,
    0,
  );
  TestValidator.equals("pagination total pages", result.pagination.pages, 0);
  TestValidator.equals("data length", result.data.length, 0);
}
