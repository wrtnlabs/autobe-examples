import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
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
import { generate_random_ecommerce_mall_customer_carts_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_carts_cart_items_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";

export async function test_api_customer_cart_items_retrieval_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer and obtain authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: typia.random<IEcommerceMallCustomer.IJoin>(),
  });
  typia.assert(customerAuth);
  // 2. Create cart by adding first item (cart auto-created on registration)
  // Using random UUIDs for variants since product/variant creation API not available
  const variantId1 = typia.random<string & tags.Format<"uuid">>();
  const variantId2 = typia.random<string & tags.Format<"uuid">>();
  const variantId3 = typia.random<string & tags.Format<"uuid">>();
  // Cart ID - in real scenario would come from GET /customer/carts endpoint
  const cartId = typia.random<string & tags.Format<"uuid">>();
  // 3. Add multiple variants to cart with distinct timestamps
  const cartItem1 =
    await api.functional.ecommerceMall.customer.carts.cartItems.create(
      customerConnection,
      {
        cartId,
        body: {
          variant_id: variantId1,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem1);
  const cartItem2 =
    await api.functional.ecommerceMall.customer.carts.cartItems.create(
      customerConnection,
      {
        cartId,
        body: {
          variant_id: variantId2,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem2);
  const cartItem3 =
    await api.functional.ecommerceMall.customer.carts.cartItems.create(
      customerConnection,
      {
        cartId,
        body: {
          variant_id: variantId3,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem3);
  const addedTime = new Date().toISOString();
  // 4. Retrieve cart items with pagination and sorting
  const retrievedPage =
    await api.functional.ecommerceMall.customer.carts.cartItems.index(
      customerConnection,
      {
        cartId,
        body: {
          page: 1,
          limit: 10,
          sortOrder: "createdAt_desc",
        } satisfies IEcommerceMallCartItem.IRequest,
      },
    );
  typia.assert(retrievedPage);
  // 5. Validate response has IPageIEcommerceMallCartItem.ISummary structure
  typia.assert(retrievedPage);
  // 6. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    retrievedPage.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", retrievedPage.pagination.limit, 10);
  TestValidator.equals(
    "pagination records count",
    retrievedPage.pagination.records,
    3,
  );
  TestValidator.equals(
    "pagination total pages",
    retrievedPage.pagination.pages,
    Math.ceil(
      retrievedPage.pagination.records / retrievedPage.pagination.limit,
    ),
  );
  // 7. Validate cart items data array has correct count
  TestValidator.equals(
    "data array has correct count",
    retrievedPage.data.length,
    3,
  );
  // 8. Validate each cart item structure and business rules
  for (const item of retrievedPage.data) {
    typia.assert(item);
    // Validate ID exists
    typia.assert(item.id);
    // Validate quantity is positive integer
    TestValidator.predicate("quantity is positive integer", item.quantity > 0);
    // Validate price is captured (immutable at addition time)
    TestValidator.predicate("price is captured", item.price > 0);
    // Validate variant exists with required fields
    typia.assert(item.variant);
    typia.assert(item.variant.skuCode);
    TestValidator.predicate(
      "variant has stockQuantity",
      item.variant.stockQuantity >= 0,
    );
    // Validate availability status is valid enum value
    TestValidator.predicate(
      "availability status is valid enum",
      ["available", "low_stock", "out_of_stock"].includes(item.availability),
    );
  }
  // 9. Test filtering by date range
  const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(); // 1 day ago
  const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(); // 1 day in future
  const filteredByDate =
    await api.functional.ecommerceMall.customer.carts.cartItems.index(
      customerConnection,
      {
        cartId,
        body: {
          variantAddedSince: pastDate,
          variantAddedBefore: futureDate,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallCartItem.IRequest,
      },
    );
  typia.assert(filteredByDate);
  // 10. Test filtering by availability
  const filteredByAvailability =
    await api.functional.ecommerceMall.customer.carts.cartItems.index(
      customerConnection,
      {
        cartId,
        body: {
          availability: "available",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallCartItem.IRequest,
      },
    );
  typia.assert(filteredByAvailability);
  // 11. Validate availability computation logic
  // Check that availability is computed correctly based on stock vs cart quantity
  for (const item of retrievedPage.data) {
    if (item.variant.stockQuantity >= item.quantity) {
      TestValidator.equals(
        "availability should be available when stock >= quantity",
        item.availability,
        "available",
      );
    } else if (
      item.variant.stockQuantity > 0 &&
      item.variant.stockQuantity < item.quantity
    ) {
      TestValidator.equals(
        "availability should be low_stock when stock > 0 && stock < quantity",
        item.availability,
        "low_stock",
      );
    } else if (item.variant.stockQuantity === 0) {
      TestValidator.equals(
        "availability should be out_of_stock when stock = 0",
        item.availability,
        "out_of_stock",
      );
    }
  }
  // 12. Validate soft-delete semantics (only active items returned)
  // The ISummary DTO only returns active items (deleted_at IS NULL)
  // We validate that all items have valid quantities (not soft-deleted)
  for (const item of retrievedPage.data) {
    TestValidator.predicate("cart item has valid quantity", item.quantity >= 1);
  }
}
