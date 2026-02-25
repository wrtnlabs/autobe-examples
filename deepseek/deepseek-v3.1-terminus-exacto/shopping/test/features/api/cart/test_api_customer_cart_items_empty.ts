import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCartItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_cart_items_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 2,
        wordMax: 4,
      }).substring(0, 50),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Test retrieving cart items with pagination parameters on authenticated connection
  // Note: The cart is implicitly created for the customer upon authentication
  // Using a valid but non-existent cart ID to test empty cart behavior
  const request = {
    page: 1,
    limit: 10,
    sort: "created_at" as const,
  } satisfies IEcommerceCartItem.IRequest;
  const response = await api.functional.ecommerce.customer.carts.items.index(
    customerConnection,
    {
      cartId: customer.id, // Use customer ID as cart ID
      body: request,
    },
  );
  typia.assert(response);
  // 3. Validate empty cart response
  TestValidator.equals("records should be 0", response.pagination.records, 0);
  TestValidator.equals("pages should be 0", response.pagination.pages, 0);
  TestValidator.equals(
    "current page should match request",
    response.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "limit should match request",
    response.pagination.limit,
    request.limit,
  );
  TestValidator.equals("data array should be empty", response.data.length, 0);
  // 4. Test with different pagination parameters
  const request2 = {
    page: 2,
    limit: 5,
  } satisfies IEcommerceCartItem.IRequest;
  const response2 = await api.functional.ecommerce.customer.carts.items.index(
    customerConnection,
    {
      cartId: customer.id,
      body: request2,
    },
  );
  typia.assert(response2);
  // 5. Validate empty cart response with different parameters
  TestValidator.equals(
    "records should still be 0",
    response2.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages should still be 0",
    response2.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page should match second request",
    response2.pagination.current,
    request2.page,
  );
  TestValidator.equals(
    "limit should match second request",
    response2.pagination.limit,
    request2.limit,
  );
  TestValidator.equals(
    "data array should still be empty",
    response2.data.length,
    0,
  );
}