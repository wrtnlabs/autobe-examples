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

export async function test_api_cart_item_soft_deleted_handling(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>() satisfies string &
          tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">,
        password: "12345678",
        href: "https://example.com/join" satisfies string & tags.Format<"uri">,
        referrer: "https://example.com" satisfies string & tags.Format<"uri">,
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(customer);
  // 2. Create shopping cart
  const cart: IEcommerceMallShoppingCart =
    await api.functional.ecommerceMall.customer.carts.create(
      customerConnection,
    );
  typia.assert(cart);
  // 3. Add product variant to cart
  const cartItem: IEcommerceMallCartItem =
    await api.functional.ecommerceMall.customer.carts.items.create(
      customerConnection,
      {
        cartId: cart.id,
        body: {
          variant_id: typia.random<string & tags.Format<"uuid">>(),
          quantity: 2 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  const itemId: string = cartItem.id;
  // 4. Delete cart item
  await api.functional.ecommerceMall.customer.carts.items.erase(
    customerConnection,
    {
      cartId: cart.id,
      itemId: itemId,
    },
  );
  // 5. Attempt to retrieve deleted cart item - should return 404
  try {
    await api.functional.ecommerceMall.customer.carts.items.at(
      customerConnection,
      {
        cartId: cart.id,
        itemId: itemId,
      },
    );
    TestValidator.error("deleted item should return 404", () => {
      throw new Error("Expected 404 error for deleted cart item");
    });
  } catch (error) {
    if (typia.is<api.HttpError>(error)) {
      TestValidator.equals("deleted item returns 404", error.status, 404);
    } else {
      throw error;
    }
  }
  // 6. Test with non-existent itemId
  const fakeItemId: string = typia.random<string & tags.Format<"uuid">>();
  try {
    await api.functional.ecommerceMall.customer.carts.items.at(
      customerConnection,
      {
        cartId: cart.id,
        itemId: fakeItemId,
      },
    );
    TestValidator.error("non-existent item should return 404", () => {
      throw new Error("Expected 404 error for non-existent cart item");
    });
  } catch (error) {
    if (typia.is<api.HttpError>(error)) {
      TestValidator.equals("non-existent item returns 404", error.status, 404);
    } else {
      throw error;
    }
  }
  // 7. Test with valid cartId but invalid itemId combination
  const anotherCartId: string = typia.random<string & tags.Format<"uuid">>();
  try {
    await api.functional.ecommerceMall.customer.carts.items.at(
      customerConnection,
      {
        cartId: anotherCartId,
        itemId: itemId,
      },
    );
    TestValidator.error("invalid combination should return 404", () => {
      throw new Error("Expected 404 error for invalid cart/item combination");
    });
  } catch (error) {
    if (typia.is<api.HttpError>(error)) {
      TestValidator.equals(
        "invalid combination returns 404",
        error.status,
        404,
      );
    } else {
      throw error;
    }
  }
}