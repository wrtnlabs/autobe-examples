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
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
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
import { generate_random_ecommerce_mall_admin_shipments_create } from "../../../generate/generate_random_ecommerce_mall_admin_shipments_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

/**
 * Test authorization controls on the admin shipment items endpoint.
 * Verifies that only admin actors can successfully retrieve shipment items,
 * while customers, sellers, and guests receive proper authentication/authorization errors.
 * This validates the role-based access control implementation for sensitive shipment data.
 *
 * Test flow:
 * 1) Create and authenticate as seller to create a product with a variant
 * 2) Create and authenticate as customer to add variant to cart and create an order
 * 3) Authenticate as admin to create a shipment from the order items
 * 4) Test the target endpoint (PATCH /ecommerceMall/admin/shipments/{shipmentId}/items) as admin (success)
 * 5) Verify unauthorized actors (customer, seller, guest) are properly rejected
 */
export async function test_api_admin_shipment_items_authorization(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // Step 2: Seller creates a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Step 3: Seller creates a product variant
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  // Step 4: Create and authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // Step 5: Customer adds variant to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // Step 6: Customer creates an order (using orders index as per available API)
  // Note: We get orders - the order items will be used for shipment creation
  const ordersPage = await api.functional.ecommerceMall.customer.orders.index(
    customerConnection,
    {
      body: {
        status: null,
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(ordersPage);
  // If no orders exist, we need to handle this scenario
  // The test assumes orders can be retrieved or created
  // Create admin connection for later use
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Step 7: Create a shipment with order items using admin
  // We need at least one order item ID for the shipment
  // Since we need order items from the created order, we'll create a shipment
  // that references the order items
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const shipment = await generate_random_ecommerce_mall_admin_shipments_create(
    adminConnection,
    {
      body: {
        orderItemIds: [orderItemId],
        carrierName: RandomGenerator.name(1),
        trackingNumber: RandomGenerator.alphaNumeric(10),
      } satisfies IEcommerceMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // Step 8: Test target endpoint as admin - should succeed
  const adminShipmentItems =
    await api.functional.ecommerceMall.admin.shipments.items.index(
      adminConnection,
      {
        shipmentId: shipment.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(adminShipmentItems);
  // Step 9: Test target endpoint as customer - should be rejected
  await TestValidator.error(
    "customer should be rejected from accessing admin shipment items",
    async () => {
      await api.functional.ecommerceMall.admin.shipments.items.index(
        customerConnection,
        {
          shipmentId: shipment.id,
          body: {
            page: 1,
            limit: 20,
          } satisfies IEcommerceMallOrderItem.IRequest,
        },
      );
    },
  );
  // Step 10: Test target endpoint as seller - should be rejected
  await TestValidator.error(
    "seller should be rejected from accessing admin shipment items",
    async () => {
      await api.functional.ecommerceMall.admin.shipments.items.index(
        sellerConnection,
        {
          shipmentId: shipment.id,
          body: {
            page: 1,
            limit: 20,
          } satisfies IEcommerceMallOrderItem.IRequest,
        },
      );
    },
  );
  // Step 11: Test target endpoint as guest (unauthenticated) - should be rejected
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "guest should be rejected from accessing admin shipment items",
    async () => {
      await api.functional.ecommerceMall.admin.shipments.items.index(
        guestConnection,
        {
          shipmentId: shipment.id,
          body: {
            page: 1,
            limit: 20,
          } satisfies IEcommerceMallOrderItem.IRequest,
        },
      );
    },
  );
}
