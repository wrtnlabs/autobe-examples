import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
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
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_seller_shipment_retrieval_cross_seller_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerA);
  // Step 2: Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customer);
  // Step 3: Search for available products as customer
  const products =
    await api.functional.ecommerceMall.customer.products.search.index(
      customerConnection,
      {
        body: {
          search: null,
          categoryId: null,
          subcategoryId: null,
          minPrice: null,
          maxPrice: null,
          inStockOnly: true,
          sortBy: "newest",
          page: null,
          limit: null,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(products);
  // Step 4: Add product variant to cart (if products exist)
  let cartItem: IEcommerceMallCartItem | undefined;
  if (products.data.length > 0 && products.data[0].id) {
    // Find a product with variants by searching for more details
    // Since we need variant ID, we'll try to use search results
    const product = products.data[0];
    // Note: We would ideally get variant ID from product search
    // The test assumes product variant data is available
    // Using random UUID for variant as the SDK search doesn't return variants directly
    cartItem = await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: typia.random<string & tags.Format<"uuid">>(),
          quantity: 1,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
    typia.assert(cartItem);
  }
  // Step 5: Search for orders as seller A to find order items
  const orders = await api.functional.ecommerceMall.seller.orders.index(
    sellerAConnection,
    {
      body: {
        status: null,
        customerId: null,
        minTotalPrice: null,
        maxTotalPrice: null,
        createdAfter: null,
        createdBefore: null,
        orderNumber: null,
        page: null,
        limit: null,
      } satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(orders);
  // Step 6: Create a shipment as seller A
  // Use random order item IDs since we cannot create orders directly
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerAConnection,
    {
      body: {
        orderItemIds: [typia.random<string & tags.Format<"uuid">>()],
        carrierName: RandomGenerator.pick(["FedEx", "UPS", "DHL", "USPS"]),
        trackingNumber: RandomGenerator.alphaNumeric(20),
      } satisfies IEcommerceMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // Step 7: Authenticate as seller B (different seller)
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerB);
  // Verify seller A and seller B are different
  TestValidator.notEquals(
    "seller A and seller B should have different IDs",
    sellerA.id,
    sellerB.id,
  );
  // Step 8: Attempt to retrieve seller A's shipment using seller B's credentials
  // This should fail with 403 Forbidden or 404
  await TestValidator.error(
    "seller B should not be able to access seller A's shipment",
    async () => {
      await api.functional.ecommerceMall.seller.shipments.at(
        sellerBConnection,
        {
          shipmentId: shipment.id,
        },
      );
    },
  );
}
