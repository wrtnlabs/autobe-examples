import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_shipment_bulk_filter_operations_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create superAdmin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: superAdminEmail,
      password: superAdminPassword,
    },
  });
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: superAdminEmail,
      password: superAdminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  // 2. Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    },
  });
  // 3. Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  // 4. Create a product as seller
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        basePrice: typia.random<number & tags.Type<"uint32">>(),
      },
    },
  );
  typia.assert(product);
  // 5. Add product to cart as customer (create order context)
  const variantId = product.variants[0]?.id;
  if (variantId) {
    const cartItem =
      await generate_random_ecommerce_mall_customer_cart_items_create(
        customerConnection,
        {
          body: {
            productVariantId: variantId,
            quantity: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
            >(),
          },
        },
      );
    typia.assert(cartItem);
  }
  // 6. Test bulk filter operations via superAdmin
  // Test 1: Get all shipments with pagination
  const allShipments =
    await api.functional.ecommerceMall.superAdmin.shipments.index(
      superAdminConnection,
      {
        body: {
          orderId: null,
          sellerId: null,
          carrierName: null,
          status: null,
          shippedAtFrom: null,
          shippedAtTo: null,
          page: 1,
          limit: 20,
          search: null,
          sort: null,
          order: null,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(allShipments);
  // Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    allShipments.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", allShipments.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records >= 0",
    allShipments.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    allShipments.pagination.pages >= 0,
  );
  // Test 2: Filter by seller ID
  const sellerShipments =
    await api.functional.ecommerceMall.superAdmin.shipments.index(
      superAdminConnection,
      {
        body: {
          orderId: null,
          sellerId: product.seller.id,
          carrierName: null,
          status: null,
          shippedAtFrom: null,
          shippedAtTo: null,
          page: 1,
          limit: 20,
          search: null,
          sort: null,
          order: null,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(sellerShipments);
  // Validate that all returned shipments belong to the specified seller
  for (const shipment of sellerShipments.data) {
    TestValidator.equals(
      "shipment seller matches filter",
      shipment.seller.id,
      product.seller.id,
    );
  }
  // Test 3: Filter by status (in_transit)
  const inTransitShipments =
    await api.functional.ecommerceMall.superAdmin.shipments.index(
      superAdminConnection,
      {
        body: {
          orderId: null,
          sellerId: null,
          carrierName: null,
          status: "in_transit",
          shippedAtFrom: null,
          shippedAtTo: null,
          page: 1,
          limit: 20,
          search: null,
          sort: null,
          order: null,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(inTransitShipments);
  // Validate delivery status for all results
  for (const shipment of inTransitShipments.data) {
    TestValidator.equals(
      "shipment status is in_transit",
      shipment.deliveryStatus,
      "in_transit",
    );
  }
  // Test 4: Filter by status (delivered)
  const deliveredShipments =
    await api.functional.ecommerceMall.superAdmin.shipments.index(
      superAdminConnection,
      {
        body: {
          orderId: null,
          sellerId: null,
          carrierName: null,
          status: "delivered",
          shippedAtFrom: null,
          shippedAtTo: null,
          page: 1,
          limit: 20,
          search: null,
          sort: null,
          order: null,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(deliveredShipments);
  // Validate delivery status for all results
  for (const shipment of deliveredShipments.data) {
    TestValidator.equals(
      "shipment status is delivered",
      shipment.deliveryStatus,
      "delivered",
    );
  }
  // Test 5: Filter by date range
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateRangeShipments =
    await api.functional.ecommerceMall.superAdmin.shipments.index(
      superAdminConnection,
      {
        body: {
          orderId: null,
          sellerId: null,
          carrierName: null,
          status: null,
          shippedAtFrom: thirtyDaysAgo.toISOString(),
          shippedAtTo: now.toISOString(),
          page: 1,
          limit: 20,
          search: null,
          sort: null,
          order: null,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(dateRangeShipments);
  // Validate shipped dates are within range
  for (const shipment of dateRangeShipments.data) {
    const shippedAt = new Date(shipment.shippedAt);
    TestValidator.predicate(
      "shippedAt within date range",
      shippedAt >= thirtyDaysAgo && shippedAt <= now,
    );
  }
  // Test 6: Combined filter (seller + status)
  const combinedFilterShipments =
    await api.functional.ecommerceMall.superAdmin.shipments.index(
      superAdminConnection,
      {
        body: {
          orderId: null,
          sellerId: product.seller.id,
          carrierName: null,
          status: "in_transit",
          shippedAtFrom: null,
          shippedAtTo: null,
          page: 1,
          limit: 20,
          search: null,
          sort: null,
          order: null,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(combinedFilterShipments);
  // Validate combined filters
  for (const shipment of combinedFilterShipments.data) {
    TestValidator.equals(
      "shipment seller matches combined filter",
      shipment.seller.id,
      product.seller.id,
    );
    TestValidator.equals(
      "shipment status matches combined filter",
      shipment.deliveryStatus,
      "in_transit",
    );
  }
  // Test 7: Test sorting by shipped_at ascending
  const sortedAscShipments =
    await api.functional.ecommerceMall.superAdmin.shipments.index(
      superAdminConnection,
      {
        body: {
          orderId: null,
          sellerId: null,
          carrierName: null,
          status: null,
          shippedAtFrom: null,
          shippedAtTo: null,
          page: 1,
          limit: 20,
          search: null,
          sort: "shipped_at",
          order: "asc",
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(sortedAscShipments);
  // Validate ascending sort order
  if (sortedAscShipments.data.length > 1) {
    for (let i = 1; i < sortedAscShipments.data.length; i++) {
      const prevDate = new Date(sortedAscShipments.data[i - 1].shippedAt);
      const currDate = new Date(sortedAscShipments.data[i].shippedAt);
      TestValidator.predicate("ascending sort order", prevDate <= currDate);
    }
  }
  // Test 8: Test sorting by shipped_at descending
  const sortedDescShipments =
    await api.functional.ecommerceMall.superAdmin.shipments.index(
      superAdminConnection,
      {
        body: {
          orderId: null,
          sellerId: null,
          carrierName: null,
          status: null,
          shippedAtFrom: null,
          shippedAtTo: null,
          page: 1,
          limit: 20,
          search: null,
          sort: "shipped_at",
          order: "desc",
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(sortedDescShipments);
  // Validate descending sort order
  if (sortedDescShipments.data.length > 1) {
    for (let i = 1; i < sortedDescShipments.data.length; i++) {
      const prevDate = new Date(sortedDescShipments.data[i - 1].shippedAt);
      const currDate = new Date(sortedDescShipments.data[i].shippedAt);
      TestValidator.predicate("descending sort order", prevDate >= currDate);
    }
  }
  // Test 9: Filter by carrier name (partial match)
  if (allShipments.data.length > 0) {
    const existingCarrier = allShipments.data[0].carrierName;
    const partialCarrierName = existingCarrier.substring(
      0,
      Math.min(3, existingCarrier.length),
    );
    const carrierFilteredShipments =
      await api.functional.ecommerceMall.superAdmin.shipments.index(
        superAdminConnection,
        {
          body: {
            orderId: null,
            sellerId: null,
            carrierName: partialCarrierName,
            status: null,
            shippedAtFrom: null,
            shippedAtTo: null,
            page: 1,
            limit: 20,
            search: null,
            sort: null,
            order: null,
          } satisfies IEcommerceMallShipment.IRequest,
        },
      );
    typia.assert(carrierFilteredShipments);
  }
  // Test 10: Empty result scenario (non-existent seller)
  const nonExistentSellerId = typia.random<string & tags.Format<"uuid">>();
  const emptyResultShipments =
    await api.functional.ecommerceMall.superAdmin.shipments.index(
      superAdminConnection,
      {
        body: {
          orderId: null,
          sellerId: nonExistentSellerId,
          carrierName: null,
          status: null,
          shippedAtFrom: null,
          shippedAtTo: null,
          page: 1,
          limit: 20,
          search: null,
          sort: null,
          order: null,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(emptyResultShipments);
  TestValidator.equals(
    "empty result data array",
    emptyResultShipments.data.length,
    0,
  );
  TestValidator.equals(
    "empty result records count",
    emptyResultShipments.pagination.records,
    0,
  );
  // Final validation - schema compliance of shipment summary
  if (allShipments.data.length > 0) {
    const sampleShipment = allShipments.data[0];
    typia.assert<IEcommerceMallShipment.ISummary>(sampleShipment);
  }
}
