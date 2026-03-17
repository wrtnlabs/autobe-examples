import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_checkout_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";

/**
 * Test eligible order items for cancellation with various filters including search, status, date range, sorting, and pagination.
 * This test validates the PATCH /ecommerceMall/customer/orderItems/eligibleForCancellation endpoint
 * which returns order items with 'paid' status that can be cancelled by the customer.
 */
export async function test_api_order_item_eligible_for_cancellation_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create seller and products
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    },
  });
  // Create products with distinctive names for search testing
  const productA = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Premium Wireless Headphones",
        description: RandomGenerator.paragraph({ sentences: 5 }),
        categoryId: typia.random<string & tags.Format<"uuid">>(),
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<10000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(productA);
  const productB = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Smart Watch Pro Series",
        description: RandomGenerator.paragraph({ sentences: 5 }),
        categoryId: typia.random<string & tags.Format<"uuid">>(),
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<50000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(productB);
  // 2. Setup: Create customer and checkout
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // Get variant from productA for cart
  const variantA = productA.variants[0];
  typia.assertGuard(variantA);
  // Get variant from productB for cart
  const variantB = productB.variants[0];
  typia.assertGuard(variantB);
  // Add items to cart
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        productVariantId: variantA.id,
        quantity: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
      } satisfies IEcommerceMallCartItem.ICreate,
    },
  );
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        productVariantId: variantB.id,
        quantity: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
      } satisfies IEcommerceMallCartItem.ICreate,
    },
  );
  // Checkout to create paid order items
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        recipientPhone: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 2,
          wordMax: 4,
        }),
        city: RandomGenerator.name(1),
        state: RandomGenerator.name(1),
        postalCode: RandomGenerator.alphaNumeric(5),
        country: RandomGenerator.name(1),
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Verify order items were created and are in 'paid' status
  TestValidator.predicate(
    "order should have at least 2 items",
    () => order.orderItems.length >= 2,
  );
  // 3. Test search filter by product name (partial match)
  const searchResult =
    await api.functional.ecommerceMall.customer.orderItems.eligibleForCancellation.index(
      customerConnection,
      {
        body: {
          search: "Wireless",
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search result should contain only matching products",
    () =>
      searchResult.data.every((item) =>
        item.product.name.toLowerCase().includes("wireless"),
      ),
  );
  // 4. Test status filter for 'paid' items
  const statusFilterResult =
    await api.functional.ecommerceMall.customer.orderItems.eligibleForCancellation.index(
      customerConnection,
      {
        body: {
          status: "paid",
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(statusFilterResult);
  TestValidator.predicate("all returned items should have status 'paid'", () =>
    statusFilterResult.data.every((item) => item.status === "paid"),
  );
  // 5. Test date range filtering using createdAtFrom and createdAtTo
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dateRangeResult =
    await api.functional.ecommerceMall.customer.orderItems.eligibleForCancellation.index(
      customerConnection,
      {
        body: {
          createdAtFrom: oneDayAgo.toISOString(),
          createdAtTo: oneDayFromNow.toISOString(),
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "date range filter should return items within range",
    () =>
      dateRangeResult.data.every((item) => {
        const itemDate = new Date(item.createdAt).getTime();
        return (
          itemDate >= oneDayAgo.getTime() && itemDate <= oneDayFromNow.getTime()
        );
      }),
  );
  // 6. Test sorting by created_at (default descending)
  const sortedByCreatedAtDesc =
    await api.functional.ecommerceMall.customer.orderItems.eligibleForCancellation.index(
      customerConnection,
      {
        body: {
          sort: "created_at",
          order: "desc",
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(sortedByCreatedAtDesc);
  TestValidator.predicate(
    "items should be sorted by created_at descending",
    () => {
      for (let i = 1; i < sortedByCreatedAtDesc.data.length; i++) {
        const prev = new Date(
          sortedByCreatedAtDesc.data[i - 1].createdAt,
        ).getTime();
        const curr = new Date(
          sortedByCreatedAtDesc.data[i].createdAt,
        ).getTime();
        if (prev < curr) return false;
      }
      return true;
    },
  );
  // 7. Test sorting by status
  const sortedByStatus =
    await api.functional.ecommerceMall.customer.orderItems.eligibleForCancellation.index(
      customerConnection,
      {
        body: {
          sort: "status",
          order: "asc",
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(sortedByStatus);
  // 8. Test sorting by price_at_purchase
  const sortedByPrice =
    await api.functional.ecommerceMall.customer.orderItems.eligibleForCancellation.index(
      customerConnection,
      {
        body: {
          sort: "price_at_purchase",
          order: "desc",
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(sortedByPrice);
  TestValidator.predicate("items should be sorted by price_at_purchase", () => {
    for (let i = 1; i < sortedByPrice.data.length; i++) {
      const prevPrice = sortedByPrice.data[i - 1].priceAtPurchase;
      const currPrice = sortedByPrice.data[i].priceAtPurchase;
      if (prevPrice < currPrice) return false;
    }
    return true;
  });
  // 9. Test sorting by quantity
  const sortedByQuantity =
    await api.functional.ecommerceMall.customer.orderItems.eligibleForCancellation.index(
      customerConnection,
      {
        body: {
          sort: "quantity",
          order: "asc",
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(sortedByQuantity);
  TestValidator.predicate(
    "items should be sorted by quantity ascending",
    () => {
      for (let i = 1; i < sortedByQuantity.data.length; i++) {
        const prevQty = sortedByQuantity.data[i - 1].quantity;
        const currQty = sortedByQuantity.data[i].quantity;
        if (prevQty > currQty) return false;
      }
      return true;
    },
  );
  // 10. Test pagination with limit
  const limitedResult =
    await api.functional.ecommerceMall.customer.orderItems.eligibleForCancellation.index(
      customerConnection,
      {
        body: {
          limit: 1,
          page: 1,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(limitedResult);
  TestValidator.equals(
    "pagination limits result count",
    limitedResult.data.length,
    limitedResult.pagination.limit,
  );
  // 11. Test pagination with different page numbers
  const page1Result =
    await api.functional.ecommerceMall.customer.orderItems.eligibleForCancellation.index(
      customerConnection,
      {
        body: {
          limit: 1,
          page: 1,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(page1Result);
  const page2Result =
    await api.functional.ecommerceMall.customer.orderItems.eligibleForCancellation.index(
      customerConnection,
      {
        body: {
          limit: 1,
          page: 2,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals(
    "pagination current page should match request",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination current page should match request for page 2",
    page2Result.pagination.current,
    2,
  );
  // 12. Test combined filters: search + status + date range
  const combinedFilterResult =
    await api.functional.ecommerceMall.customer.orderItems.eligibleForCancellation.index(
      customerConnection,
      {
        body: {
          search: "Premium",
          status: "paid",
          createdAtFrom: oneDayAgo.toISOString(),
          createdAtTo: oneDayFromNow.toISOString(),
          sort: "created_at",
          order: "desc",
          limit: 10,
          page: 1,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(combinedFilterResult);
  TestValidator.predicate("combined filters should return valid results", () =>
    combinedFilterResult.data.every((item) => {
      const matchesSearch = item.product.name.toLowerCase().includes("premium");
      const matchesStatus = item.status === "paid";
      const itemDate = new Date(item.createdAt).getTime();
      const matchesDate =
        itemDate >= oneDayAgo.getTime() && itemDate <= oneDayFromNow.getTime();
      return matchesSearch && matchesStatus && matchesDate;
    }),
  );
}
