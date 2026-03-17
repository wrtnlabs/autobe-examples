import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCartItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_cart_empty_state(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new customer with an empty cart
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // Step 2: Retrieve cart items for the new customer (should be empty)
  const cartPage = await api.functional.ecommerceMall.customer.cartItems.index(
    customerConnection,
    {
      body: {
        cursor: null,
        limit: 10,
        product_id: null,
        variant_id: null,
        min_quantity: null,
        availability_status: "all",
        search: null,
        page: 1,
      } satisfies IEcommerceMallCartItem.IRequest,
    },
  );
  typia.assert(cartPage);
  // Step 3: Verify empty cart state with proper pagination metadata
  TestValidator.equals("cart data array is empty", cartPage.data, []);
  TestValidator.equals(
    "pagination records is 0",
    cartPage.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages is 0", cartPage.pagination.pages, 0);
  TestValidator.equals(
    "pagination current page is 1",
    cartPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    cartPage.pagination.limit,
    10,
  );
}
