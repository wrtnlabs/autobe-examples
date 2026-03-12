import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test cart items list with various filters and sorting options.
 *
 * This test validates the cart items listing functionality with pagination,
 * sorting (by quantity, created_at, updated_at), and filtering (by variantId,
 * quantity range). It ensures the API correctly handles all filter combinations
 * and returns properly sorted and paginated results.
 */
export async function test_api_cart_items_list_with_filters_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {},
  });
  typia.assert(customer);
  // 2. Default behavior test - no filters
  const defaultResult =
    await api.functional.shoppingMall.customer.cart_items.index(
      customerConnection,
      {
        body: {} satisfies IShoppingMallCartItem.IRequest,
      },
    );
  typia.assert(defaultResult);
  // 3. Pagination test - limit to 2 items
  const paginationResult =
    await api.functional.shoppingMall.customer.cart_items.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies IShoppingMallCartItem.IRequest,
      },
    );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination limit respected",
    paginationResult.data.length,
    Math.min(2, paginationResult.pagination.records),
  );
  TestValidator.equals(
    "pagination limit in metadata",
    paginationResult.pagination.limit,
    2,
  );
  // 4. Sorting by quantity ascending
  const sortByQuantityAsc =
    await api.functional.shoppingMall.customer.cart_items.index(
      customerConnection,
      {
        body: {
          sortBy: "quantity",
          sortOrder: "asc",
        } satisfies IShoppingMallCartItem.IRequest,
      },
    );
  typia.assert(sortByQuantityAsc);
  TestValidator.predicate(
    "sorted by quantity ascending",
    sortByQuantityAsc.data.length <= 1 ||
      sortByQuantityAsc.data.every((item, index, array) =>
        index === 0 ? true : array[index - 1].quantity <= item.quantity,
      ),
  );
  // 5. Sorting by quantity descending
  const sortByQuantityDesc =
    await api.functional.shoppingMall.customer.cart_items.index(
      customerConnection,
      {
        body: {
          sortBy: "quantity",
          sortOrder: "desc",
        } satisfies IShoppingMallCartItem.IRequest,
      },
    );
  typia.assert(sortByQuantityDesc);
  TestValidator.predicate(
    "sorted by quantity descending",
    sortByQuantityDesc.data.length <= 1 ||
      sortByQuantityDesc.data.every((item, index, array) =>
        index === 0 ? true : array[index - 1].quantity >= item.quantity,
      ),
  );
  // 6. Sorting by created_at descending
  const sortByCreatedAtDesc =
    await api.functional.shoppingMall.customer.cart_items.index(
      customerConnection,
      {
        body: {
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IShoppingMallCartItem.IRequest,
      },
    );
  typia.assert(sortByCreatedAtDesc);
  TestValidator.predicate(
    "sorted by created_at descending",
    sortByCreatedAtDesc.data.length <= 1 ||
      sortByCreatedAtDesc.data.every((item, index, array) =>
        index === 0
          ? true
          : new Date(array[index - 1].created_at) >= new Date(item.created_at),
      ),
  );
  // 7. Sorting by updated_at ascending
  const sortByUpdatedAtAsc =
    await api.functional.shoppingMall.customer.cart_items.index(
      customerConnection,
      {
        body: {
          sortBy: "updated_at",
          sortOrder: "asc",
        } satisfies IShoppingMallCartItem.IRequest,
      },
    );
  typia.assert(sortByUpdatedAtAsc);
  TestValidator.predicate(
    "sorted by updated_at ascending",
    sortByUpdatedAtAsc.data.length <= 1 ||
      sortByUpdatedAtAsc.data.every((item, index, array) =>
        index === 0
          ? true
          : new Date(array[index - 1].updated_at) <= new Date(item.updated_at),
      ),
  );
  // 8. Variant ID filter
  if (defaultResult.data.length > 0) {
    const targetVariantId = defaultResult.data[0].variant.id;
    const variantFilterResult =
      await api.functional.shoppingMall.customer.cart_items.index(
        customerConnection,
        {
          body: {
            variantId: targetVariantId,
          } satisfies IShoppingMallCartItem.IRequest,
        },
      );
    typia.assert(variantFilterResult);
    TestValidator.predicate(
      "variantId filter returns matching items only",
      variantFilterResult.data.every(
        (item) => item.variant.id === targetVariantId,
      ),
    );
  }
  // 9. Quantity range filter (minQuantity=3, maxQuantity=8)
  const quantityRangeResult =
    await api.functional.shoppingMall.customer.cart_items.index(
      customerConnection,
      {
        body: {
          minQuantity: 3,
          maxQuantity: 8,
        } satisfies IShoppingMallCartItem.IRequest,
      },
    );
  typia.assert(quantityRangeResult);
  TestValidator.predicate(
    "quantity range filter works correctly",
    quantityRangeResult.data.every(
      (item) => item.quantity >= 3 && item.quantity <= 8,
    ),
  );
  // 10. Combined filters test
  const combinedFiltersResult =
    await api.functional.shoppingMall.customer.cart_items.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sortBy: "quantity",
          sortOrder: "desc",
          minQuantity: 1,
          maxQuantity: 100,
        } satisfies IShoppingMallCartItem.IRequest,
      },
    );
  typia.assert(combinedFiltersResult);
  TestValidator.equals(
    "combined filters pagination limit",
    combinedFiltersResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "combined filters quantity range",
    combinedFiltersResult.data.every(
      (item) => item.quantity >= 1 && item.quantity <= 100,
    ),
  );
  TestValidator.predicate(
    "combined filters sorted by quantity desc",
    combinedFiltersResult.data.length <= 1 ||
      combinedFiltersResult.data.every((item, index, array) =>
        index === 0 ? true : array[index - 1].quantity >= item.quantity,
      ),
  );
}
