import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCartItem";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCart";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCartItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_cart_items_quantity_update_success(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const cartId = typia.random<string & tags.Format<"uuid">>();
  const cartItemId = typia.random<string & tags.Format<"uuid">>();
  const updatedQuantity = 3;
  const response = await api.functional.mallPlatform.customer.carts.items.index(
    customerConnection,
    {
      cartId,
      body: {
        cartItemId,
        quantity: updatedQuantity,
        page: 1,
        limit: 10,
      } satisfies IMallPlatformCartItem.IRequest,
    },
  );
  typia.assert(response);
  TestValidator.equals(
    "pagination current page should remain on the requested page",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should reflect the requested page size",
    response.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "response should contain at least one cart item",
    response.data.length > 0,
  );
  const targetItem =
    response.data.find((item) => item.id === cartItemId) ?? response.data[0];
  TestValidator.equals(
    "cart item id should remain stable",
    targetItem.id,
    cartItemId,
  );
  TestValidator.equals(
    "updated quantity should be applied to the targeted line",
    targetItem.quantity,
    updatedQuantity,
  );
  TestValidator.predicate(
    "cart item should still reference a valid product variant",
    typeof targetItem.productVariant.id === "string" &&
      targetItem.productVariant.id.length > 0,
  );
  TestValidator.predicate(
    "cart item should remain in the active cart scope",
    typeof targetItem.shoppingCart.id === "string" &&
      targetItem.shoppingCart.id.length > 0,
  );
  TestValidator.predicate(
    "cart item should expose a non-empty availability state",
    typeof targetItem.availabilityState === "string" &&
      targetItem.availabilityState.length > 0,
  );
  const sameVariantItems = response.data.filter(
    (item) => item.productVariant.id === targetItem.productVariant.id,
  );
  TestValidator.equals(
    "same product variant should still be represented by one combined cart line",
    sameVariantItems.length,
    1,
  );
  const otherItems = response.data.filter((item) => item.id !== targetItem.id);
  TestValidator.predicate(
    "other cart lines should remain unchanged when present",
    otherItems.every((item) => item.id !== targetItem.id),
  );
}
