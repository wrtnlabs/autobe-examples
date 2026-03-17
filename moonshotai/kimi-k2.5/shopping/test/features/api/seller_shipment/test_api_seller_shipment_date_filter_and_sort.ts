import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
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
import { generate_random_ecommerce_mall_customer_cart_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_create";
import { generate_random_ecommerce_mall_customer_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_checkout_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_registrations_create } from "../../../generate/generate_random_ecommerce_mall_seller_registrations_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { generate_random_ecommerce_mall_seller_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_variants_inventory_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";
import { prepare_random_ecommerce_mall_seller_registration } from "../../../prepare/prepare_random_ecommerce_mall_seller_registration";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_seller_shipment_date_filter_and_sort(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // Setup: Create seller account with registration
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
  typia.assert(seller);
  // Create seller registration
  const registration =
    await api.functional.ecommerceMall.seller.registrations.create(
      sellerConnection,
      {
        body: {
          taxIdentificationNumber: typia.random<string>(),
          businessRegistrationNumber: typia.random<string>(),
          businessName: RandomGenerator.name(3),
          businessAddress: RandomGenerator.name(5),
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallSellerRegistration.ICreate,
      },
    );
  typia.assert(registration);
  // Admin approves seller
  const approvedRegistration =
    await api.functional.ecommerceMall.admin.seller_registrations.update(
      adminConnection,
      {
        registrationId: (registration as any).id,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IEcommerceMallSellerRegistration.IUpdate,
      },
    );
  typia.assert(approvedRegistration);
  // Create category as admin
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 1 }),
        parentId: null,
      },
    },
  );
  typia.assert(category);
  // Create product as seller
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: category.id,
        basePrice: 1000,
      },
    },
  );
  typia.assert(product);
  // Create variant as seller
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(10),
          options: [
            { optionName: "Color", optionValue: "Red" },
            { optionName: "Size", optionValue: "Large" },
          ],
          price: 1200,
          stock: 100,
        },
      },
    );
  typia.assert(variant);
  // Add inventory as seller
  const inventory =
    await generate_random_ecommerce_mall_seller_variants_inventory_create(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity: 50,
          reason: "Restock",
        },
      },
    );
  typia.assert(inventory);
  // Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(customer);
  // First order flow
  const cartItem1 = await generate_random_ecommerce_mall_customer_cart_create(
    customerConnection,
    {
      body: {
        productVariantId: variant.id,
        quantity: 1,
      },
    },
  );
  typia.assert(cartItem1);
  const order1 = await api.functional.ecommerceMall.customer.checkout.create(
    customerConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        recipientPhone: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.name(5),
        city: RandomGenerator.name(2),
        state: RandomGenerator.name(2),
        postalCode: RandomGenerator.alphaNumeric(6),
        country: RandomGenerator.name(1),
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order1);
  // Get order items for first order to create shipment
  const orderItem1 = order1.orderItems[0];
  // Create first shipment (older date)
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const shipment1 = await api.functional.ecommerceMall.seller.shipments.create(
    sellerConnection,
    {
      body: {
        orderItemIds: [(orderItem1 as IEntity).id],
        carrierName: "FedEx",
        trackingNumber: RandomGenerator.alphaNumeric(20),
      } satisfies IEcommerceMallShipment.ICreate,
    },
  );
  typia.assert(shipment1);
  // Second order flow
  const cartItem2 = await generate_random_ecommerce_mall_customer_cart_create(
    customerConnection,
    {
      body: {
        productVariantId: variant.id,
        quantity: 2,
      },
    },
  );
  typia.assert(cartItem2);
  const order2 = await api.functional.ecommerceMall.customer.checkout.create(
    customerConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        recipientPhone: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.name(5),
        city: RandomGenerator.name(2),
        state: RandomGenerator.name(2),
        postalCode: RandomGenerator.alphaNumeric(6),
        country: RandomGenerator.name(1),
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order2);
  const orderItem2 = order2.orderItems[0];
  // Create second shipment (more recent date)
  const shipment2 = await api.functional.ecommerceMall.seller.shipments.create(
    sellerConnection,
    {
      body: {
        orderItemIds: [(orderItem2 as IEntity).id],
        carrierName: "UPS",
        trackingNumber: RandomGenerator.alphaNumeric(20),
      } satisfies IEcommerceMallShipment.ICreate,
    },
  );
  typia.assert(shipment2);
  // Test 1: Search without filters (verify shipments exist)
  const allShipments =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(allShipments);
  TestValidator.predicate(
    "should have at least 2 shipments",
    allShipments.pagination.records >= 2,
  );
  // Test 2: Date range filter (past 5 days)
  const dateRangeResult =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          shippedAtFrom: threeDaysAgo.toISOString(),
          shippedAtTo: oneWeekLater.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "date range filter should return shipments",
    dateRangeResult.pagination.records >= 2,
  );
  // Verify shippedAt timestamps are ISO 8601 formatted
  for (const shipment of dateRangeResult.data) {
    typia.assert(shipment);
    TestValidator.predicate(
      `shipment ${shipment.id} has valid shippedAt ISO format`,
      typeof shipment.shippedAt === "string" &&
        !isNaN(Date.parse(shipment.shippedAt)),
    );
  }
  // Test 3: Sort by shippedAt descending
  const sortedDescResult =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          sort: ["-shippedAt"],
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(sortedDescResult);
  // Verify descending order
  if (sortedDescResult.data.length >= 2) {
    const first = new Date(sortedDescResult.data[0].shippedAt).getTime();
    const second = new Date(sortedDescResult.data[1].shippedAt).getTime();
    TestValidator.predicate(
      "descending sort: first >= second",
      first >= second,
    );
  }
  // Test 4: Sort by shippedAt ascending
  const sortedAscResult =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          sort: ["+shippedAt"],
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(sortedAscResult);
  // Verify ascending order
  if (sortedAscResult.data.length >= 2) {
    const first = new Date(sortedAscResult.data[0].shippedAt).getTime();
    const second = new Date(sortedAscResult.data[1].shippedAt).getTime();
    TestValidator.predicate("ascending sort: first <= second", first <= second);
  }
  // Test 5: Pagination with limit
  const pagedResult = await api.functional.ecommerceMall.seller.shipments.index(
    sellerConnection,
    {
      body: {
        page: 1,
        limit: 1,
      } satisfies IEcommerceMallShipment.IRequest,
    },
  );
  typia.assert(pagedResult);
  TestValidator.equals(
    "pagination limit should be respected",
    pagedResult.pagination.limit,
    1,
  );
  TestValidator.equals(
    "should return at most limit items",
    pagedResult.data.length <= 1,
    true,
  );
  // Test 6: Filter by carrier name
  const carrierResult =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          carrierName: "FedEx",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(carrierResult);
  // Test 7: Filter by tracking number
  const trackingResult =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          trackingNumber: shipment1.trackingNumber.substring(0, 5),
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(trackingResult);
}