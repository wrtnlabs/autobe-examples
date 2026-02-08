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

export async function test_api_customer_email_verifications_listing_success(
  connection: api.IConnection,
): Promise<void> {
  // Test scenario: retrieve a paginated list of email verification tokens for an authenticated customer with standard success.
  // 1. Join to create a new customer and get authorized token
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {} satisfies IShoppingMallCustomer.IJoin,
  });
  customerConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Call the email-verifications listing API (PATCH /shoppingMall/customer/email-verifications) with empty filter (since IRequest is empty object)
  const response =
    await api.functional.shoppingMall.customer.email_verifications.index(
      customerConnection,
      {
        body: {}, // No filters in IRequest
      },
    );
  // 3. Assert the response using typia
  typia.assert(response);
  // 4. Assert pagination properties
  TestValidator.predicate(
    "pagination current page is positive",
    response.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // 5. Assert that response data array is defined and each element is a valid summary
  TestValidator.predicate("data array is array", Array.isArray(response.data));
  if (response.data.length > 0) {
    for (const item of response.data) {
      typia.assert(item);
    }
  }
}
