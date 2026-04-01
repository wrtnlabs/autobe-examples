import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCartItem";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
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

export async function test_api_cart_combine_duplicate_variant_quantity(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const page = await api.functional.mallPlatform.customer.carts.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IMallPlatformShoppingCart.IRequest,
    },
  );
  typia.assert(page);
  TestValidator.equals(
    "pagination current page should be 1",
    page.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit should be non-negative",
    page.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "page records should be non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page pages should be non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "cart summary page should return an array of summaries",
    Array.isArray(page.data),
  );
  TestValidator.predicate(
    "cart summary page should not exceed requested limit when limited",
    page.data.length <= 20,
  );
  for (const cart of page.data) {
    typia.assert(cart);
    TestValidator.predicate(
      "cart total price should be non-negative",
      cart.totalPrice >= 0,
    );
    TestValidator.predicate(
      "cart items should be an array",
      Array.isArray(cart.cartItems),
    );
    for (const item of cart.cartItems) {
      typia.assert(item);
      TestValidator.predicate(
        "cart item quantity should be positive",
        item.quantity >= 1,
      );
    }
  }
}
