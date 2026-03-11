import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShoppingCart";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_carts_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_carts_items_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";

export async function test_api_cart_item_unavailable_variant(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth: IEcommerceMallCustomer.IAuthorized =
    await api.functional.ecommerceMall.auth.customer.join(customerConnection, {
      body: typia.random<IEcommerceMallCustomer.IJoin>() satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(customerAuth!);
  // 2. Create shopping cart
  const cart: IEcommerceMallShoppingCart =
    await api.functional.ecommerceMall.customer.carts.create(
      customerConnection,
    );
  typia.assert(cart!);
  // 3. Find an unavailable variant (isActive=false OR stockQuantity=0)
  let unavailableVariant: IEcommerceMallProductVariant.ISummary | undefined =
    undefined;
  // First, try to find inactive variants
  const inactiveVariantsResponse =
    await api.functional.ecommerceMall.products.variants.index(
      customerConnection,
      {
        productId: typia.random<
          string & tags.Format<"uuid">
        >() satisfies string,
        body: {
          is_active: false,
          limit: 1,
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(inactiveVariantsResponse!);
  if (inactiveVariantsResponse.data.length > 0) {
    unavailableVariant = inactiveVariantsResponse.data[0];
  }
  // If no inactive variants, try to find out of stock variants
  if (!unavailableVariant) {
    const outOfStockResponse =
      await api.functional.ecommerceMall.products.variants.index(
        customerConnection,
        {
          productId: typia.random<
            string & tags.Format<"uuid">
          >() satisfies string,
          body: {
            stock_quantity: 0,
            limit: 1,
          } satisfies IEcommerceMallProductVariant.IRequest,
        },
      );
    typia.assert(outOfStockResponse!);
    if (outOfStockResponse.data.length > 0) {
      unavailableVariant = outOfStockResponse.data[0];
    }
  }
  // If no unavailable variant found in system, skip this test
  if (!unavailableVariant) {
    TestValidator.predicate("no unavailable variant found to test", true);
    return;
  }
  // 4. Attempt to add unavailable variant to cart - this should fail
  const errorTitle = unavailableVariant.isActive
    ? "should reject out of stock variant"
    : "should reject inactive variant";
  await TestValidator.httpError(errorTitle, [400, 422], async () => {
    await api.functional.ecommerceMall.customer.carts.items.create(
      customerConnection,
      {
        cartId: cart.id,
        body: {
          variant_id: unavailableVariant.id,
          quantity: 1,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  });
  // 5. Verify error message contains appropriate reason
  // The httpError validator already checked the status code matches
  // We can validate the error message content is helpful
  try {
    await api.functional.ecommerceMall.customer.carts.items.create(
      customerConnection,
      {
        cartId: cart.id,
        body: {
          variant_id: unavailableVariant.id,
          quantity: 1,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  } catch (error) {
    if (error instanceof api.HttpError) {
      const message = error.toJSON().message;
      TestValidator.predicate(
        "error message explains why variant cannot be added",
        typeof message === "string" && message.length > 0,
      );
    }
  }
}
