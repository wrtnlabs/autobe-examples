import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_customer_cart_item } from "../../../prepare/prepare_random_shopping_mall_customer_cart_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test cart items filtering by availability and pagination functionality.
 *
 * Validates the complete cart listing workflow with various filtering options including availability status, quantity ranges, date ranges, and sorting preferences. Ensures that pagination metadata is accurate and that filters correctly narrow down cart items based on specified criteria.
 *
 * Special attention is given to verifying that the availableOnly filter excludes items referencing deleted or out-of-stock variants, and that pagination correctly calculates total pages based on filtered results rather than total cart items.
 *
 * 1. Customer registers and authenticates.
 * 2. Seller registers and authenticates.
 * 3. Seller creates 25 products with variants (exceeds default page limit of 20).
 * 4. Customer adds all 25 variants to cart with varying quantities.
 * 5. Test availableOnly filter to verify unavailable items are excluded.
 * 6. Test pagination with custom page and limit parameters.
 * 7. Test sorting by quantity, subtotal, productName, and createdAt fields.
 * 8. Test quantity range filters with minQuantity and maxQuantity.
 * 9. Test date range filters with createdAtFrom and createdAtTo.
 * 10. Verify pagination metadata (current, limit, records, pages) is accurate.
 */
export async function test_api_cart_list_filtering_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Seller creates 25 products with variants
  const products: IShoppingMallProduct[] = [];
  const variants: IShoppingMallProductVariant[] = [];
  for (let i = 0; i < 25; i++) {
    const product = await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: `Test Product ${i + 1}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          base_price: typia.random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<1000> &
              tags.Maximum<100000>
          >(),
        },
      },
    );
    typia.assert(product);
    products.push(product);
    const variant =
      await generate_random_shopping_mall_seller_products_variants_create(
        sellerConnection,
        {
          body: {
            sku_code: `SKU-${i + 1}`,
            variantOptions: [
              { key: "color", value: i % 2 === 0 ? "Red" : "Blue" },
              {
                key: "size",
                value: i % 3 === 0 ? "Small" : i % 3 === 1 ? "Medium" : "Large",
              },
            ],
            initialStockQuantity:
              i < 20
                ? typia.random<
                    number & tags.Type<"uint32"> & tags.Minimum<10>
                  >()
                : 0,
          },
          params: {
            productId: product.id,
          },
        },
      );
    typia.assert(variant);
    variants.push(variant);
  }
  // 4. Customer adds all 25 variants to cart with varying quantities
  const cartItems: IShoppingMallCustomerCartItem[] = [];
  for (let i = 0; i < 25; i++) {
    const cartItem =
      await generate_random_shopping_mall_customer_cart_items_create(
        customerConnection,
        {
          body: {
            productVariantId: variants[i].id,
            quantity: (i % 5) + 1, // quantities 1-5
          },
        },
      );
    typia.assert(cartItem);
    cartItems.push(cartItem);
  }
  // 5. Test availableOnly filter
  const availableOnlyResult =
    await api.functional.shoppingMall.customer.carts.index(customerConnection, {
      body: {
        availableOnly: true,
      } satisfies IShoppingMallCustomerCartItem.IRequest,
    });
  typia.assert(availableOnlyResult);
  TestValidator.predicate(
    "availableOnly filter excludes unavailable items",
    availableOnlyResult.data.every((item) => item.available),
  );
  TestValidator.equals(
    "availableOnly returns only available items count",
    availableOnlyResult.data.length,
    20,
  );
  // 6. Test pagination with custom page and limit
  const paginationResult =
    await api.functional.shoppingMall.customer.carts.index(customerConnection, {
      body: {
        page: 2,
        limit: 10,
      } satisfies IShoppingMallCustomerCartItem.IRequest,
    });
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination current page",
    paginationResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit",
    paginationResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination returns correct items per page",
    paginationResult.data.length <= 10,
  );
  TestValidator.predicate(
    "pagination metadata records is accurate",
    paginationResult.pagination.records === 25,
  );
  TestValidator.equals(
    "pagination pages calculation",
    paginationResult.pagination.pages,
    3,
  );
  // 7. Test sorting by quantity DESC
  const sortQuantityDesc =
    await api.functional.shoppingMall.customer.carts.index(customerConnection, {
      body: {
        sortBy: "quantity",
        sortOrder: "DESC",
        limit: 100,
      } satisfies IShoppingMallCustomerCartItem.IRequest,
    });
  typia.assert(sortQuantityDesc);
  TestValidator.predicate(
    "sort by quantity DESC",
    sortQuantityDesc.data.every(
      (item, index, array) =>
        index === 0 || item.quantity <= array[index - 1].quantity,
    ),
  );
  // 8. Test sorting by subtotal ASC
  const sortSubtotalAsc =
    await api.functional.shoppingMall.customer.carts.index(customerConnection, {
      body: {
        sortBy: "subtotal",
        sortOrder: "ASC",
        limit: 100,
      } satisfies IShoppingMallCustomerCartItem.IRequest,
    });
  typia.assert(sortSubtotalAsc);
  TestValidator.predicate(
    "sort by subtotal ASC",
    sortSubtotalAsc.data.every(
      (item, index, array) =>
        index === 0 || item.subtotal >= array[index - 1].subtotal,
    ),
  );
  // 9. Test sorting by productName ASC
  const sortProductNameAsc =
    await api.functional.shoppingMall.customer.carts.index(customerConnection, {
      body: {
        sortBy: "productName",
        sortOrder: "ASC",
        limit: 100,
      } satisfies IShoppingMallCustomerCartItem.IRequest,
    });
  typia.assert(sortProductNameAsc);
  TestValidator.predicate(
    "sort by productName ASC",
    sortProductNameAsc.data.every(
      (item, index, array) =>
        index === 0 ||
        item.product.name.localeCompare(array[index - 1].product.name) >= 0,
    ),
  );
  // 10. Test sorting by createdAt ASC
  const sortCreatedAtAsc =
    await api.functional.shoppingMall.customer.carts.index(customerConnection, {
      body: {
        sortBy: "createdAt",
        sortOrder: "ASC",
        limit: 100,
      } satisfies IShoppingMallCustomerCartItem.IRequest,
    });
  typia.assert(sortCreatedAtAsc);
  TestValidator.predicate(
    "sort by createdAt ASC",
    sortCreatedAtAsc.data.every(
      (item, index, array) =>
        index === 0 ||
        new Date(item.created_at).getTime() >=
          new Date(array[index - 1].created_at).getTime(),
    ),
  );
  // 11. Test quantity range filters
  const quantityRangeResult =
    await api.functional.shoppingMall.customer.carts.index(customerConnection, {
      body: {
        minQuantity: 2,
        maxQuantity: 4,
        limit: 100,
      } satisfies IShoppingMallCustomerCartItem.IRequest,
    });
  typia.assert(quantityRangeResult);
  TestValidator.predicate(
    "quantity range filter works",
    quantityRangeResult.data.every(
      (item) => item.quantity >= 2 && item.quantity <= 4,
    ),
  );
  // 12. Test date range filters
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const dateRangeResult =
    await api.functional.shoppingMall.customer.carts.index(customerConnection, {
      body: {
        createdAtFrom: oneHourAgo.toISOString(),
        createdAtTo: now.toISOString(),
        limit: 100,
      } satisfies IShoppingMallCustomerCartItem.IRequest,
    });
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "date range filter returns items within range",
    dateRangeResult.data.length > 0,
  );
  // 13. Test default pagination (no parameters)
  const defaultResult = await api.functional.shoppingMall.customer.carts.index(
    customerConnection,
    {
      body: {} satisfies IShoppingMallCustomerCartItem.IRequest,
    },
  );
  typia.assert(defaultResult);
  TestValidator.equals("default page", defaultResult.pagination.current, 1);
  TestValidator.equals("default limit", defaultResult.pagination.limit, 20);
  TestValidator.equals("default records", defaultResult.pagination.records, 25);
  TestValidator.equals("default pages", defaultResult.pagination.pages, 2);
  // 14. Test empty results with exclusive filter
  const emptyResult = await api.functional.shoppingMall.customer.carts.index(
    customerConnection,
    {
      body: {
        minQuantity: 100,
        maxQuantity: 200,
      } satisfies IShoppingMallCustomerCartItem.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals("empty results data length", emptyResult.data.length, 0);
  TestValidator.equals(
    "empty results records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals("empty results pages", emptyResult.pagination.pages, 0);
}
