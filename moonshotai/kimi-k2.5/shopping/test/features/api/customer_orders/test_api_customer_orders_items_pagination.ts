import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_checkout_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

export async function test_api_customer_orders_items_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin user
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.ecommerceMall.auth.admin.join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<
        string & tags.Format<"url">
      >() satisfies string as string,
      referrer: typia.random<
        string & tags.Format<"url">
      >() satisfies string as string,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Create seller user
  const sellerConnection: api.IConnection = { host: connection.host };
  await api.functional.ecommerceMall.auth.seller.join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 3. Create customer user
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await api.functional.ecommerceMall.auth.customer.join(
    customerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEcommerceMallCustomer.IJoin,
    },
  );
  typia.assert(customer);
  // 4. Admin creates category
  const category = await api.functional.ecommerceMall.admin.categories.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 5. Seller creates product
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: "Test Product " + RandomGenerator.alphabets(5),
        description: RandomGenerator.content({ paragraphs: 2 }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Minimum<100> & tags.Maximum<9999>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 6. Seller creates multiple variants for the product (to create multiple order items)
  const variantCount = 5;
  const variants: IEcommerceMallProductVariant[] = [];
  for (let i = 0; i < variantCount; i++) {
    const variant =
      await api.functional.ecommerceMall.seller.products.variants.create(
        sellerConnection,
        {
          productId: product.id,
          body: {
            skuCode: `SKU-${RandomGenerator.alphaNumeric(8).toUpperCase()}`,
            options: [
              {
                optionName: "Size",
                optionValue: [
                  "Small",
                  "Medium",
                  "Large",
                  "X-Large",
                  "XX-Large",
                ][i],
              } satisfies IEcommerceMallProductVariantOption.ICreate,
            ],
            price: typia.random<number & tags.Minimum<0>>() as number | null,
            stock: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
          } satisfies IEcommerceMallProductVariant.ICreate,
        },
      );
    typia.assert(variant);
    variants.push(variant);
  }
  // 7. Customer adds multiple variants to cart
  for (const variant of variants) {
    const cartItem =
      await api.functional.ecommerceMall.customer.cartItems.create(
        customerConnection,
        {
          body: {
            productVariantId: variant.id,
            quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          } satisfies IEcommerceMallCartItem.ICreate,
        },
      );
    typia.assert(cartItem);
  }
  // 8. Customer checkout to create order
  const order = await api.functional.ecommerceMall.customer.checkout.create(
    customerConnection,
    {
      body: {
        recipientName: "John Doe",
        recipientPhone: "01012345678",
        streetAddress: "123 Test Street",
        city: "Seoul",
        state: null,
        postalCode: "12345",
        country: "KR",
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Verify order has the expected number of items
  TestValidator.equals(
    "order should have 5 order items",
    order.orderItems.length,
    variantCount,
  );
  // 9. Test pagination - Default pagination (page and limit omitted)
  const defaultPage: IPageIEcommerceMallOrderItem.ISummary =
    await api.functional.ecommerceMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: {} satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(defaultPage);
  TestValidator.predicate(
    "default page should have data",
    defaultPage.data.length > 0,
  );
  TestValidator.predicate(
    "default page should have pagination",
    defaultPage.pagination !== undefined,
  );
  TestValidator.equals(
    "default page current should be 1",
    defaultPage.pagination.current,
    1,
  );
  // 10. Test pagination - Explicitly request page 1
  const page1: IPageIEcommerceMallOrderItem.ISummary =
    await api.functional.ecommerceMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: {
          page: 1 satisfies number as number,
          limit: 2 satisfies number as number,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.predicate(
    "page 1 should have at most 2 items",
    page1.data.length <= 2,
  );
  TestValidator.equals(
    "page 1 current should be 1",
    page1.pagination.current,
    1,
  );
  // 11. Test pagination - Navigate to page 2
  const page2: IPageIEcommerceMallOrderItem.ISummary =
    await api.functional.ecommerceMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: {
          page: 2 satisfies number as number,
          limit: 2 satisfies number as number,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.predicate(
    "page 2 should have at most 2 items",
    page2.data.length <= 2,
  );
  TestValidator.equals(
    "page 2 current should be 2",
    page2.pagination.current,
    2,
  );
  // Page 1 and Page 2 should be different
  if (page1.data.length > 0 && page2.data.length > 0) {
    TestValidator.notEquals(
      "page 1 and page 2 should have different data",
      page1.data[0].id,
      page2.data[0].id,
    );
  }
  // 12. Test pagination - Limit parameter (1 to 100)
  const pageWithLimit1: IPageIEcommerceMallOrderItem.ISummary =
    await api.functional.ecommerceMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: {
          page: 1 satisfies number as number,
          limit: 1 satisfies number as number,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(pageWithLimit1);
  TestValidator.predicate(
    "limit 1 should return at most 1 item",
    pageWithLimit1.data.length <= 1,
  );
  TestValidator.equals(
    "limit in response should match request",
    pageWithLimit1.pagination.limit,
    1,
  );
  // Test max limit
  const pageWithMaxLimit: IPageIEcommerceMallOrderItem.ISummary =
    await api.functional.ecommerceMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: {
          page: 1 satisfies number as number,
          limit: 100 satisfies number as number,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(pageWithMaxLimit);
  // 13. Test pagination metadata accuracy
  const allItemsPage: IPageIEcommerceMallOrderItem.ISummary =
    await api.functional.ecommerceMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: {
          page: 1 satisfies number as number,
          limit: 100 satisfies number as number,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(allItemsPage);
  const totalRecords = allItemsPage.pagination.records;
  const totalPages = allItemsPage.pagination.pages;
  TestValidator.equals("total records should be 5", totalRecords, variantCount);
  TestValidator.predicate(
    "total pages calculation",
    totalPages === Math.ceil(totalRecords / 100) || totalPages >= 1,
  );
  // 14. Test empty result set by requesting page beyond available data
  const emptyPage: IPageIEcommerceMallOrderItem.ISummary =
    await api.functional.ecommerceMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: {
          page: 9999 satisfies number as number,
          limit: 10 satisfies number as number,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals(
    "page beyond available data should have empty array",
    emptyPage.data.length,
    0,
  );
  TestValidator.equals(
    "empty page current should match request",
    emptyPage.pagination.current,
    9999,
  );
  TestValidator.equals(
    "empty page records should show total",
    emptyPage.pagination.records,
    totalRecords,
  );
  // 15. Test sorting by created_at desc (default - newest first)
  const sortedByCreatedDesc: IPageIEcommerceMallOrderItem.ISummary =
    await api.functional.ecommerceMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: {
          sort: "created_at",
          order: "desc",
          page: 1 satisfies number as number,
          limit: 100 satisfies number as number,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(sortedByCreatedDesc);
  // Verify items are sorted by created_at desc
  for (let i = 0; i < sortedByCreatedDesc.data.length - 1; i++) {
    const current = new Date(sortedByCreatedDesc.data[i].createdAt).getTime();
    const next = new Date(sortedByCreatedDesc.data[i + 1].createdAt).getTime();
    TestValidator.predicate(
      "items should be sorted by created_at desc (newest first)",
      current >= next,
    );
  }
  // 16. Test sorting by status
  const sortedByStatus: IPageIEcommerceMallOrderItem.ISummary =
    await api.functional.ecommerceMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: {
          sort: "status",
          order: "asc",
          page: 1 satisfies number as number,
          limit: 100 satisfies number as number,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(sortedByStatus);
  // Verify items are sorted by status
  for (let i = 0; i < sortedByStatus.data.length - 1; i++) {
    const currentStatus = sortedByStatus.data[i].status;
    const nextStatus = sortedByStatus.data[i + 1].status;
    TestValidator.predicate(
      "items should be sorted by status ascending",
      currentStatus.localeCompare(nextStatus) <= 0,
    );
  }
  // 17. Test search parameter filtering by product name (partial match)
  // Get one of the product names to search for
  const searchTerm = product.name.substring(0, 5);
  const searchResult: IPageIEcommerceMallOrderItem.ISummary =
    await api.functional.ecommerceMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: {
          search: searchTerm,
          page: 1 satisfies number as number,
          limit: 100 satisfies number as number,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(searchResult);
  // Verify search results match the search term
  for (const item of searchResult.data) {
    TestValidator.predicate(
      "search result item product name should contain search term",
      item.product.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }
  // 18. Test pagination with search (search + pagination together)
  const searchWithPagination: IPageIEcommerceMallOrderItem.ISummary =
    await api.functional.ecommerceMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: {
          search: searchTerm,
          page: 1 satisfies number as number,
          limit: 2 satisfies number as number,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(searchWithPagination);
  TestValidator.predicate(
    "search with pagination should have pagination metadata",
    searchWithPagination.pagination !== undefined,
  );
  TestValidator.equals(
    "search pagination current should be 1",
    searchWithPagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "search pagination limit should match",
    searchWithPagination.pagination.limit,
    2,
  );
  // 19. Test status filter
  const filteredByStatus: IPageIEcommerceMallOrderItem.ISummary =
    await api.functional.ecommerceMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: {
          status: "paid" satisfies "paid" as "paid",
          page: 1 satisfies number as number,
          limit: 100 satisfies number as number,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(filteredByStatus);
  // Verify all items have "paid" status
  for (const item of filteredByStatus.data) {
    TestValidator.equals(
      "filtered item should have paid status",
      item.status,
      "paid",
    );
  }
}