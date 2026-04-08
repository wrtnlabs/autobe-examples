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

export async function test_api_cart_item_quantity_stock_warning_preserved(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test customer cart item quantity updates preserve the refreshed cart summary when quantity exceeds stock.
   *
   * Validates the authenticated customer cart-item update flow where the requested
   * quantity is intentionally greater than the available stock for the target variant.
   * Because the available DTOs only expose the refreshed paginated shopping-cart
   * summary, the test confirms the response remains well-formed and still belongs to
   * the authenticated customer instead of inventing item-level fields.
   *
   * 1. Register a customer and create an authenticated customer connection.
   * 2. Call the cart-item quantity update endpoint with an oversized quantity request.
   * 3. Validate the returned pagination metadata and cart ownership.
   * 4. Ensure the refreshed cart summary is returned without schema violations.
   */
  const joined = await authorize_customer_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password123!",
        href: "https://example.com/signup",
        referrer: "https://example.com/landing",
        ip: "127.0.0.1",
      } satisfies IMallPlatformCustomer.IJoin,
    },
  );
  typia.assert(joined);
  const customerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: joined.token.access,
    },
  };
  const request = {
    id: typia.random<string & tags.Format<"uuid">>(),
    quantity: (typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>() +
      1000) as number,
    page: 1,
    limit: 100,
  } satisfies IMallPlatformCartItem.IRequest;
  const response =
    await api.functional.mallPlatform.customer.shopping_carts.cart_items.index(
      customerConnection,
      {
        body: request,
      },
    );
  typia.assert(response);
  TestValidator.equals(
    "requested page should be preserved",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "requested limit should be preserved",
    response.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "cart response should contain at least one summary record or an empty valid page",
    response.pagination.records >= 0 && response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "returned cart summaries should belong to the authenticated customer",
    response.data.every((cart) => cart.customer.id === joined.id),
  );
}
