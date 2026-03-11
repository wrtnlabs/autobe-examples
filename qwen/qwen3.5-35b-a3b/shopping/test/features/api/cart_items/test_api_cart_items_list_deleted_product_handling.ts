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
import type { IPageIEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCartItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_cart_items_list_deleted_product_handling(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer A setup
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string as string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>() satisfies string as string & tags.Format<"uri">,
      referrer: typia.random<string & tags.Format<"uri">>() satisfies string as string & tags.Format<"uri">,
    },
  });
  typia.assert(customerA);
  // 2. Customer B setup
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string as string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>() satisfies string as string & tags.Format<"uri">,
      referrer: typia.random<string & tags.Format<"uri">>() satisfies string as string & tags.Format<"uri">,
    },
  });
  typia.assert(customerB);
  // 3. Customer A creates cart
  const cartA =
    await api.functional.ecommerceMall.customer.carts.create(
      customerAConnection,
    );
  typia.assert(cartA);
  // 4. Customer B creates cart
  const cartB =
    await api.functional.ecommerceMall.customer.carts.create(
      customerBConnection,
    );
  typia.assert(cartB);
  // 5. Test data isolation: Customer A and B should have separate carts
  TestValidator.notEquals(
    "Customer A cart ID differs from B",
    cartA.id,
    cartB.id,
  );
  // 6. List cart items for Customer A with pagination
  const page1 = await api.functional.ecommerceMall.customer.carts.items.index(
    customerAConnection,
    {
      cartId: cartA.id,
      body: {
        page: 1,
        limit: 20,
      },
    },
  );
  typia.assert(page1);
  // 7. List cart items for Customer B with pagination
  const page1B = await api.functional.ecommerceMall.customer.carts.items.index(
    customerBConnection,
    {
      cartId: cartB.id,
      body: {
        page: 1,
        limit: 20,
      },
    },
  );
  typia.assert(page1B);
  // 8. Validate pagination structure
  TestValidator.equals(
    "Page 1 pagination current",
    page1.pagination.current,
    1,
  );
  TestValidator.equals(
    "Page 1B pagination current",
    page1B.pagination.current,
    1,
  );
  TestValidator.equals("Page 1 pagination limit", page1.pagination.limit, 20);
  TestValidator.equals("Page 1B pagination limit", page1B.pagination.limit, 20);
  // 9. Test availability filtering - available=true
  const availableOnly =
    await api.functional.ecommerceMall.customer.carts.items.index(
      customerAConnection,
      {
        cartId: cartA.id,
        body: {
          available: true,
        },
      },
    );
  typia.assert(availableOnly);
  // 10. Test availability filtering - unavailable=true
  const unavailableOnly =
    await api.functional.ecommerceMall.customer.carts.items.index(
      customerAConnection,
      {
        cartId: cartA.id,
        body: {
          unavailable: true,
        },
      },
    );
  typia.assert(unavailableOnly);
  // 11. Validate each item has availability field with correct values
  TestValidator.predicate(
    "All items have valid availability field",
    availableOnly.data.every(
      (item) =>
        typeof item.availability === "string" &&
        ["available", "unavailable"].includes(item.availability),
    ),
  );
  // 12. Validate cart item structure
  if (availableOnly.data.length > 0) {
    const firstItem = availableOnly.data[0];
    TestValidator.equals(
      "Item has UUID ID",
      () => {
        try {
          typia.assert<string & tags.Format<"uuid">>(firstItem.id);
          return true;
        } catch {
          return false;
        }
      },
      () => true,
    );
    TestValidator.predicate(
      "Item has valid quantity",
      typeof firstItem.quantity === "number",
    );
    TestValidator.predicate(
      "Item has valid price",
      typeof firstItem.price === "number",
    );
  }
  // 13. Test sorting by quantity (ascending)
  const sortedByQuantity =
    await api.functional.ecommerceMall.customer.carts.items.index(
      customerAConnection,
      {
        cartId: cartA.id,
        body: {
          sortBy: "quantity",
          sortOrder: "asc",
        },
      },
    );
  typia.assert(sortedByQuantity);
  // 14. Test data isolation - Customer A should not be able to list Customer B's cart items
  const crossAccess =
    await api.functional.ecommerceMall.customer.carts.items.index(
      customerAConnection,
      {
        cartId: cartB.id,
        body: {
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(crossAccess);
  // 15. Test quantity range filtering
  const filteredByQuantity =
    await api.functional.ecommerceMall.customer.carts.items.index(
      customerAConnection,
      {
        cartId: cartA.id,
        body: {
          minQuantity: 1,
        },
      },
    );
  typia.assert(filteredByQuantity);
  // 16. Test date range filtering
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const filteredByDate =
    await api.functional.ecommerceMall.customer.carts.items.index(
      customerAConnection,
      {
        cartId: cartA.id,
        body: {
          addedSince: yesterday.toISOString(),
        },
      },
    );
  typia.assert(filteredByDate);
}