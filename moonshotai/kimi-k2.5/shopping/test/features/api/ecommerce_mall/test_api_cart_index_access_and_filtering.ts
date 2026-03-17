import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCartItem";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";

export async function test_api_cart_index_access_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create two customer accounts with separate connections
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerA);
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerB);
  // 2. Add cart items for customerA (multiple items with different quantities)
  const cartItemA1 =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerAConnection,
      {
        body: {
          productVariantId: typia.random<string & tags.Format<"uuid">>(),
          quantity: 3,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItemA1);
  const cartItemA2 =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerAConnection,
      {
        body: {
          productVariantId: typia.random<string & tags.Format<"uuid">>(),
          quantity: 5,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItemA2);
  const cartItemA3 =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerAConnection,
      {
        body: {
          productVariantId: typia.random<string & tags.Format<"uuid">>(),
          quantity: 1,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItemA3);
  // 3. Add cart item for customerB to verify isolation
  const cartItemB1 =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerBConnection,
      {
        body: {
          productVariantId: typia.random<string & tags.Format<"uuid">>(),
          quantity: 2,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItemB1);
  // 4. Verify customerA can only see their own cart items
  const customerACart = await api.functional.ecommerceMall.customer.cart.index(
    customerAConnection,
    {
      body: {
        cursor: null,
        limit: 10,
        product_id: null,
        variant_id: null,
        min_quantity: null,
        availability_status: "all",
        search: null,
      } satisfies IEcommerceMallCartItem.IRequest,
    },
  );
  typia.assert(customerACart);
  TestValidator.equals(
    "customerA sees only their own cart items",
    customerACart.data.length,
    3,
  );
  TestValidator.predicate(
    "customerA cart contains only their items",
    customerACart.data.every(
      (item) =>
        item.id === cartItemA1.id ||
        item.id === cartItemA2.id ||
        item.id === cartItemA3.id,
    ),
  );
  // 5. Verify customerB can only see their own cart items
  const customerBCart = await api.functional.ecommerceMall.customer.cart.index(
    customerBConnection,
    {
      body: {
        cursor: null,
        limit: 10,
        product_id: null,
        variant_id: null,
        min_quantity: null,
        availability_status: "all",
        search: null,
      } satisfies IEcommerceMallCartItem.IRequest,
    },
  );
  typia.assert(customerBCart);
  TestValidator.equals(
    "customerB sees only their own cart items",
    customerBCart.data.length,
    1,
  );
  TestValidator.equals(
    "customerB cart contains their item",
    customerBCart.data[0].id,
    cartItemB1.id,
  );
  // 6. Test filtering by minimum_quantity (should return only items with quantity >= 3)
  const minQuantityFilter =
    await api.functional.ecommerceMall.customer.cart.index(
      customerAConnection,
      {
        body: {
          cursor: null,
          limit: 10,
          product_id: null,
          variant_id: null,
          min_quantity: 3,
          availability_status: "all",
          search: null,
        } satisfies IEcommerceMallCartItem.IRequest,
      },
    );
  typia.assert(minQuantityFilter);
  TestValidator.predicate(
    "min_quantity filter returns only items with sufficient quantity",
    minQuantityFilter.data.every((item) => item.quantity >= 3),
  );
  TestValidator.equals(
    "min_quantity filter returns correct count",
    minQuantityFilter.data.length,
    2,
  );
  // 7. Test filtering by variant_id
  const variantFilter = await api.functional.ecommerceMall.customer.cart.index(
    customerAConnection,
    {
      body: {
        cursor: null,
        limit: 10,
        product_id: null,
        variant_id: cartItemA1.productVariant.id,
        min_quantity: null,
        availability_status: "all",
        search: null,
      } satisfies IEcommerceMallCartItem.IRequest,
    },
  );
  typia.assert(variantFilter);
  TestValidator.equals(
    "variant_id filter returns single matching item",
    variantFilter.data.length,
    1,
  );
  TestValidator.equals(
    "variant_id filter returns correct item",
    variantFilter.data[0].id,
    cartItemA1.id,
  );
  // 8. Test pagination with limit
  const paginatedCart = await api.functional.ecommerceMall.customer.cart.index(
    customerAConnection,
    {
      body: {
        cursor: null,
        limit: 2,
        product_id: null,
        variant_id: null,
        min_quantity: null,
        availability_status: "all",
        search: null,
      } satisfies IEcommerceMallCartItem.IRequest,
    },
  );
  typia.assert(paginatedCart);
  TestValidator.equals(
    "pagination limit returns correct number of items",
    paginatedCart.data.length,
    2,
  );
  TestValidator.equals(
    "pagination limit is respected",
    paginatedCart.pagination.limit,
    2,
  );
  // 9. Test cursor-based pagination
  if (paginatedCart.data.length > 0) {
    const lastItem = paginatedCart.data[paginatedCart.data.length - 1];
    const secondPage = await api.functional.ecommerceMall.customer.cart.index(
      customerAConnection,
      {
        body: {
          cursor: lastItem.id,
          limit: 2,
          product_id: null,
          variant_id: null,
          min_quantity: null,
          availability_status: "all",
          search: null,
        } satisfies IEcommerceMallCartItem.IRequest,
      },
    );
    typia.assert(secondPage);
    TestValidator.equals(
      "cursor pagination returns remaining items",
      secondPage.data.length,
      1,
    );
  }
}
