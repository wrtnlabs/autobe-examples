import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPayment";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCartItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_carts_items_create } from "../../../generate/generate_random_shopping_mall_customer_carts_items_create";
import { prepare_random_shopping_mall_shopping_cart_item } from "../../../prepare/prepare_random_shopping_mall_shopping_cart_item";

export async function test_api_customer_payment_history_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await api.functional.shoppingMall.auth.customer.join(
    customerConnection,
    {
      body: {
        email: typia.random<
          string &
            tags.Format<"email"> &
            tags.MinLength<1> &
            tags.MaxLength<255>
        >(),
        password: "12341234",
        display_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: "https://shop.example.com/join",
        referrer: "https://google.com/search",
      } satisfies IShoppingMallCustomer.IJoin,
    },
  );
  typia.assert(customer);
  // 2. Create authenticated customer connection using the token
  const authenticatedCustomerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${customer.token.access}`,
    },
  };
  // 3. Test with status filter
  const status = "completed";
  const response = await api.functional.shoppingMall.customer.payments.index(
    authenticatedCustomerConnection,
    {
      body: {
        status: status,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallPayment.IRequest,
    },
  );
  typia.assert(response);
  // 4. Validate response structure
  TestValidator.predicate("has pagination", response.pagination != null);
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 10);
  TestValidator.predicate(
    "pagination has records",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    response.pagination.pages >= 0,
  );
  // 5. Validate data array
  TestValidator.predicate(
    "data array exists",
    response.data != null && Array.isArray(response.data),
  );
  // 6. Validate each payment summary in data array
  for (const payment of response.data) {
    typia.assert(payment);
    TestValidator.equals(
      "payment status matches filter",
      payment.status,
      status,
    );
  }
  // 7. Test with different pagination
  const paginatedResponse =
    await api.functional.shoppingMall.customer.payments.index(
      authenticatedCustomerConnection,
      {
        body: {
          status: status,
          page: 1,
          limit: 1,
        } satisfies IShoppingMallPayment.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "pagination limited to 1",
    paginatedResponse.data.length,
    1,
  );
}
