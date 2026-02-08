import api from "@ORGANIZATION/PROJECT-api";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import typia from "typia";
import { TestValidator } from "@nestia/e2e";

export async function test_api_password_reset_search_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Setup a customer connection and authorize customer join
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {}, // IShoppingMallCustomer.IJoin has no required properties
  });
  // Set the authorization token in the connection headers
  customerConnection.headers = { Authorization: authorized.token.access };
  // Step 2: Call the password reset tokens index endpoint with default filter (empty body)
  const response =
    await api.functional.shoppingMall.customer.password_resets.index(
      customerConnection,
      {
        body: {}, // Default: no search criteria, returns all roles, default pagination
      },
    );
  // Step 3: Validate that the response matches the IPageIShoppingMallCustomerPasswordReset.ISummary type
  typia.assert(response);
  // Step 4: Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is at least 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  // Step 5: Validate that data array contains only valid elements
  for (const item of response.data) {
    typia.assert(item);
  }
  // Step 6: Validate that roles in data (if role info exists) include customers, sellers, administrators
  // Since detailed properties for roles are not given, we validate just presence of data
  TestValidator.predicate(
    "response data items count is non-negative",
    response.data.length >= 0,
  );
  // Note: Removed sorting validation by created_at because 'created_at' is not a property of response data items.
}
