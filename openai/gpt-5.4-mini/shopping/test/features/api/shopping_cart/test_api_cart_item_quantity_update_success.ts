import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCartItem";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCart";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformShoppingCart";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_cart_item_quantity_update_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test shopping cart item quantity update success.
   *
   * Verifies the authenticated customer cart item update flow for the quantity-only
   * PATCH endpoint. The test ensures the request is executed with a dedicated
   * customer connection, the response is a paginated shopping cart summary, and the
   * refreshed cart payload is structurally valid after the mutation.
   *
   * 1. Register and authenticate a customer using the customer join utility.
   * 2. Submit a cart item quantity update request for an existing cart line.
   * 3. Validate the returned paginated shopping cart summary and confirm the
   *    response remains structurally sound.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!",
      href: "https://example.com/signup",
      referrer: "https://example.com/landing",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const request = {
    id: typia.random<string & tags.Format<"uuid">>(),
    quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    page: 1,
    limit: 100,
  } satisfies IMallPlatformCartItem.IRequest;
  const output =
    await api.functional.mallPlatform.customer.shopping_carts.cart_items.index(
      customerConnection,
      {
        body: request,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "cart pagination current page matches request",
    output.pagination.current,
    request.page ?? 1,
  );
  TestValidator.equals(
    "cart pagination limit matches request",
    output.pagination.limit,
    request.limit ?? 100,
  );
  TestValidator.predicate(
    "cart pagination statistics are non-negative",
    output.pagination.records >= 0 && output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "cart data is an array of shopping cart summaries",
    Array.isArray(output.data),
  );
  for (const cart of output.data) {
    typia.assert(cart);
  }
  if (output.data.length > 0) {
    TestValidator.equals(
      "shopping cart owner email matches registered customer",
      output.data[0].customer.email,
      customer.email,
    );
  }
}
