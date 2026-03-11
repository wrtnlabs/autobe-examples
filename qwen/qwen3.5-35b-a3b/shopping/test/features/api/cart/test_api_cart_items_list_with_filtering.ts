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
import { generate_random_ecommerce_mall_customer_carts_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_carts_items_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";

export async function test_api_cart_items_list_with_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - join and create cart
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email">
      >() satisfies string as string &
        tags.Format<"email"> &
        tags.MinLength<1> &
        tags.MaxLength<255>,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string & tags.Format<"uri">,
      referrer: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string & tags.Format<"uri">,
      ip: typia.random<
        string & tags.Format<"ipv4">
      >() satisfies string as string & tags.Format<"ipv4">,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create cart for customer
  const cart =
    await api.functional.ecommerceMall.customer.carts.create(
      customerConnection,
    );
  typia.assert(cart);
  // 3. Add Variant A (quantity 2)
  const variantAId = typia.random<string & tags.Format<"uuid">>();
  const variantA =
    await api.functional.ecommerceMall.customer.carts.items.create(
      customerConnection,
      {
        cartId: cart.id,
        body: {
          variant_id: variantAId,
          quantity: 2,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(variantA);
  const variantAAddedAt = variantA.createdAt;
  const variantAPrice = variantA.price;
  // 4. Add Variant B (quantity 1) after a small delay
  const delay = () => new Promise((resolve) => setTimeout(resolve, 10));
  await delay();
  const variantBId = typia.random<string & tags.Format<"uuid">>();
  const variantB =
    await api.functional.ecommerceMall.customer.carts.items.create(
      customerConnection,
      {
        cartId: cart.id,
        body: {
          variant_id: variantBId,
          quantity: 1,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(variantB);
  const variantBAddedAt = variantB.createdAt;
  const variantBPrice = variantB.price;
  // 5. Primary success - list all items
  const allItemsResponse =
    await api.functional.ecommerceMall.customer.carts.items.index(
      customerConnection,
      {
        cartId: cart.id,
        body: {},
      },
    );
  typia.assert(allItemsResponse);
  TestValidator.equals("all items count", allItemsResponse.data.length, 2);
  // 6. Verify quantities match input
  const quantityValues = allItemsResponse.data
    .map((item) => item.quantity)
    .sort();
  TestValidator.equals("quantities match", quantityValues[0], 1);
  TestValidator.equals("quantities match", quantityValues[1], 2);
  // 7. Verify snapshotPrice from when added
  const variantAItem = allItemsResponse.data.find(
    (item) => item.variant.id === variantAId,
  );
  const variantBItem = allItemsResponse.data.find(
    (item) => item.variant.id === variantBId,
  );
  TestValidator.predicate(
    "variant A has snapshotPrice",
    variantAItem!.price > 0,
  );
  TestValidator.predicate(
    "variant B has snapshotPrice",
    variantBItem!.price > 0,
  );
  TestValidator.equals(
    "variant A price matches",
    variantAItem!.price,
    variantAPrice,
  );
  TestValidator.equals(
    "variant B price matches",
    variantBItem!.price,
    variantBPrice,
  );
  // 8. Verify availability status exists
  TestValidator.predicate(
    "variant A availability value",
    ["available", "unavailable"].includes(variantAItem!.availability),
  );
  TestValidator.predicate(
    "variant B availability value",
    ["available", "unavailable"].includes(variantBItem!.availability),
  );
  // 9. Verify addedAt timestamps exist and are valid
  TestValidator.predicate(
    "variant A addedAt is valid date-time",
    new Date(variantAItem!.addedAt).getTime() > 0,
  );
  TestValidator.predicate(
    "variant B addedAt is valid date-time",
    new Date(variantBItem!.addedAt).getTime() > 0,
  );
  // 10. Filter by minQuantity=2
  const minQuantityResponse =
    await api.functional.ecommerceMall.customer.carts.items.index(
      customerConnection,
      {
        cartId: cart.id,
        body: { minQuantity: 2 },
      },
    );
  typia.assert(minQuantityResponse);
  TestValidator.equals(
    "minQuantity filter count",
    minQuantityResponse.data.length,
    1,
  );
  TestValidator.equals(
    "minQuantity returns quantity 2 item",
    minQuantityResponse.data[0].quantity,
    2,
  );
  // 11. Filter by maxQuantity=1
  const maxQuantityResponse =
    await api.functional.ecommerceMall.customer.carts.items.index(
      customerConnection,
      {
        cartId: cart.id,
        body: { maxQuantity: 1 },
      },
    );
  typia.assert(maxQuantityResponse);
  TestValidator.equals(
    "maxQuantity filter count",
    maxQuantityResponse.data.length,
    1,
  );
  TestValidator.equals(
    "maxQuantity returns quantity 1 item",
    maxQuantityResponse.data[0].quantity,
    1,
  );
  // 12. Filter by availability=available
  const availableResponse =
    await api.functional.ecommerceMall.customer.carts.items.index(
      customerConnection,
      {
        cartId: cart.id,
        body: { available: true },
      },
    );
  typia.assert(availableResponse);
  TestValidator.equals(
    "available filter count",
    availableResponse.data.length,
    2,
  );
  // 13. Filter by addedSince (set to before both additions)
  const pastTime = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
  const addedSinceResponse =
    await api.functional.ecommerceMall.customer.carts.items.index(
      customerConnection,
      {
        cartId: cart.id,
        body: { addedSince: pastTime },
      },
    );
  typia.assert(addedSinceResponse);
  TestValidator.equals(
    "addedSince filter count",
    addedSinceResponse.data.length,
    2,
  );
  // 14. Sort by quantity descending
  const quantityDescResponse =
    await api.functional.ecommerceMall.customer.carts.items.index(
      customerConnection,
      {
        cartId: cart.id,
        body: { sortBy: "quantity", sortOrder: "desc" },
      },
    );
  typia.assert(quantityDescResponse);
  TestValidator.equals(
    "quantity desc first item qty",
    quantityDescResponse.data[0].quantity,
    2,
  );
  TestValidator.equals(
    "quantity desc second item qty",
    quantityDescResponse.data[1].quantity,
    1,
  );
  // 15. Sort by quantity ascending
  const quantityAscResponse =
    await api.functional.ecommerceMall.customer.carts.items.index(
      customerConnection,
      {
        cartId: cart.id,
        body: { sortBy: "quantity", sortOrder: "asc" },
      },
    );
  typia.assert(quantityAscResponse);
  TestValidator.equals(
    "quantity asc first item qty",
    quantityAscResponse.data[0].quantity,
    1,
  );
  TestValidator.equals(
    "quantity asc second item qty",
    quantityAscResponse.data[1].quantity,
    2,
  );
  // 16. Sort by snapshotPrice descending
  const priceDescResponse =
    await api.functional.ecommerceMall.customer.carts.items.index(
      customerConnection,
      {
        cartId: cart.id,
        body: { sortBy: "snapshotPrice", sortOrder: "desc" },
      },
    );
  typia.assert(priceDescResponse);
  TestValidator.predicate(
    "price desc ordering",
    priceDescResponse.data[0].price >= priceDescResponse.data[1].price,
  );
  // 17. Sort by addedAt descending (variant B added after variant A)
  const addedAtDescResponse =
    await api.functional.ecommerceMall.customer.carts.items.index(
      customerConnection,
      {
        cartId: cart.id,
        body: { sortBy: "addedAt", sortOrder: "desc" },
      },
    );
  typia.assert(addedAtDescResponse);
  TestValidator.equals(
    "addedAt desc first should be variant B",
    addedAtDescResponse.data[0].variant.id,
    variantBId,
  );
  TestValidator.equals(
    "addedAt desc second should be variant A",
    addedAtDescResponse.data[1].variant.id,
    variantAId,
  );
  // 18. Sort by addedAt ascending
  const addedAtAscResponse =
    await api.functional.ecommerceMall.customer.carts.items.index(
      customerConnection,
      {
        cartId: cart.id,
        body: { sortBy: "addedAt", sortOrder: "asc" },
      },
    );
  typia.assert(addedAtAscResponse);
  TestValidator.equals(
    "addedAt asc first should be variant A",
    addedAtAscResponse.data[0].variant.id,
    variantAId,
  );
  TestValidator.equals(
    "addedAt asc second should be variant B",
    addedAtAscResponse.data[1].variant.id,
    variantBId,
  );
  // 19. Pagination - page 1, limit 1
  const page1Response =
    await api.functional.ecommerceMall.customer.carts.items.index(
      customerConnection,
      {
        cartId: cart.id,
        body: { page: 1, limit: 1 },
      },
    );
  typia.assert(page1Response);
  TestValidator.equals("page 1 items count", page1Response.data.length, 1);
  TestValidator.equals("page 1 current", page1Response.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1Response.pagination.limit, 1);
  // 20. Pagination - page 2, limit 1
  const page2Response =
    await api.functional.ecommerceMall.customer.carts.items.index(
      customerConnection,
      {
        cartId: cart.id,
        body: { page: 2, limit: 1 },
      },
    );
  typia.assert(page2Response);
  TestValidator.equals("page 2 items count", page2Response.data.length, 1);
  TestValidator.equals("page 2 current", page2Response.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Response.pagination.limit, 1);
  // 21. Verify pagination metadata
  TestValidator.equals("total items", page1Response.pagination.records, 2);
  TestValidator.equals("total pages", page1Response.pagination.pages, 2);
  TestValidator.equals("page 2 records", page2Response.pagination.records, 2);
  TestValidator.equals("page 2 pages", page2Response.pagination.pages, 2);
  // 22. Data isolation - create second customer
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2 = await authorize_customer_join(customer2Connection, {
    body: {
      email: typia.random<
        string & tags.Format<"email">
      >() satisfies string as string &
        tags.Format<"email"> &
        tags.MinLength<1> &
        tags.MaxLength<255>,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string & tags.Format<"uri">,
      referrer: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string & tags.Format<"uri">,
      ip: typia.random<
        string & tags.Format<"ipv4">
      >() satisfies string as string & tags.Format<"ipv4">,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer2);
  // 23. Create cart for second customer
  const cart2 =
    await api.functional.ecommerceMall.customer.carts.create(
      customer2Connection,
    );
  typia.assert(cart2);
  // 24. Add variant to second customer's cart
  const variantCId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.ecommerceMall.customer.carts.items.create(
    customer2Connection,
    {
      cartId: cart2.id,
      body: {
        variant_id: variantCId,
        quantity: 3,
      } satisfies IEcommerceMallCartItem.ICreate,
    },
  );
  // 25. Verify first customer's cart has no items from second customer
  const isolationResponse =
    await api.functional.ecommerceMall.customer.carts.items.index(
      customerConnection,
      {
        cartId: cart.id,
        body: {},
      },
    );
  typia.assert(isolationResponse);
  TestValidator.equals(
    "isolation - only 2 items in first cart",
    isolationResponse.data.length,
    2,
  );
  TestValidator.notEquals(
    "isolation - no cross-cart contamination",
    isolationResponse.data.some((item) => item.variant.id === variantCId),
    true,
  );
  // 26. Verify second customer's cart has only their own item
  const isolationResponse2 =
    await api.functional.ecommerceMall.customer.carts.items.index(
      customer2Connection,
      {
        cartId: cart2.id,
        body: {},
      },
    );
  typia.assert(isolationResponse2);
  TestValidator.equals(
    "isolation - only 1 item in second cart",
    isolationResponse2.data.length,
    1,
  );
  TestValidator.equals(
    "second cart variant",
    isolationResponse2.data[0].variant.id,
    variantCId,
  );
}
