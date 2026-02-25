import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceDeliveryConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDeliveryConfirmation";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceOrderSnapshotCategoryPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotCategoryPerformance";
import type { IEcommerceOrderSnapshotGeographicDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistribution";
import type { IEcommerceOrderSnapshotGeographicDistributionCity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionCity";
import type { IEcommerceOrderSnapshotGeographicDistributionCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionCountry";
import type { IEcommerceOrderSnapshotGeographicDistributionRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionRegion";
import type { IEcommerceOrderSnapshotGeographicDistributionTopRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionTopRegion";
import type { IEcommerceOrderSnapshotGeographicDistributionUnknown } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionUnknown";
import type { IEcommerceOrderSnapshotHourlyDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotHourlyDistribution";
import type { IEcommerceOrderSnapshotSellerPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotSellerPerformance";
import type { IEcommerceOrderSnapshotStatusDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotStatusDistribution";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import type { IEcommerceShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShoppingCart";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceShoppingCart";
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
import { generate_random_ecommerce_customer_carts_items_create } from "../../../generate/generate_random_ecommerce_customer_carts_items_create";
import { generate_random_ecommerce_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_customer_refund_requests_create";
import { generate_random_ecommerce_seller_orders_shipments_create } from "../../../generate/generate_random_ecommerce_seller_orders_shipments_create";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { generate_random_ecommerce_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_seller_products_variants_create";
import { prepare_random_ecommerce_cart_item } from "../../../prepare/prepare_random_ecommerce_cart_item";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";
import { prepare_random_ecommerce_refund_request } from "../../../prepare/prepare_random_ecommerce_refund_request";
import { prepare_random_ecommerce_shipment } from "../../../prepare/prepare_random_ecommerce_shipment";

export async function test_api_refund_request_unauthorized_seller_error(
  connection: api.IConnection,
): Promise<void> {
  // Create actual seller (product owner)
  const actualSellerConnection: api.IConnection = { host: connection.host };
  const actualSeller = await authorize_seller_join(actualSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(actualSeller);
  // Create product owned by actual seller
  const product = await generate_random_ecommerce_seller_products_create(
    actualSellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<1000> &
            tags.Maximum<10000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // Create product variant with inventory
  const variant =
    await generate_random_ecommerce_seller_products_variants_create(
      actualSellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku: RandomGenerator.alphaNumeric(10),
          option_values: JSON.stringify({ color: "red", size: "M" }),
          price_override: null,
          quantity: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<10> & tags.Maximum<100>
          >(),
        } satisfies IEcommerceProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // Create customer who will purchase and request refund
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // Create shopping cart for customer
  const cartResult = await api.functional.ecommerce.customer.carts.index(
    customerConnection,
    {
      body: {
        customer_id: customer.id,
        page: 1,
        limit: 10,
      } satisfies IEcommerceShoppingCart.IRequest,
    },
  );
  typia.assert(cartResult);
  // Add product variant to cart
  const cartItem = await generate_random_ecommerce_customer_carts_items_create(
    customerConnection,
    {
      params: { cartId: cartResult.data[0].id },
      body: {
        product_variant_id: variant.id,
        quantity: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
      } satisfies IEcommerceCartItem.ICreate,
    },
  );
  typia.assert(cartItem);
  // Complete checkout to create order
  const order = await api.functional.ecommerce.customer.checkout.create(
    customerConnection,
    {
      body: {
        customer_id: customer.id,
        page: 1,
        limit: 10,
      } satisfies IEcommerceOrder.IRequest,
    },
  );
  typia.assert(order);
  // Create shipment as actual seller
  const shipment =
    await generate_random_ecommerce_seller_orders_shipments_create(
      actualSellerConnection,
      {
        params: { orderId: typia.random<string & tags.Format<"uuid">>() },
        body: {
          tracking_number: RandomGenerator.alphaNumeric(15),
          carrier_name: RandomGenerator.name(),
          shipping_cost: typia.random<
            number & tags.Minimum<500> & tags.Maximum<5000>
          >(),
        } satisfies IEcommerceShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // Customer confirms delivery
  const deliveryConfirmation =
    await api.functional.ecommerce.customer.shipments.delivery_confirmations.create(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(deliveryConfirmation);
  // Customer submits refund request
  const refundRequest =
    await generate_random_ecommerce_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // Create unauthorized seller who will attempt to respond
  const unauthorizedSellerConnection: api.IConnection = {
    host: connection.host,
  };
  const unauthorizedSeller = await authorize_seller_join(
    unauthorizedSellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "12345678",
        shop_name: RandomGenerator.name(),
        shop_description: RandomGenerator.paragraph({ sentences: 2 }),
        logo_image_url: typia.random<string & tags.Format<"uri">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceSeller.IJoin,
    },
  );
  typia.assert(unauthorizedSeller);
  // Attempt to respond to refund request using unauthorized seller - should throw error
  await TestValidator.error(
    "unauthorized seller should not be able to respond to refund request",
    async () => {
      await api.functional.ecommerce.customer.refund_requests.respond(
        unauthorizedSellerConnection,
        {
          refundRequestId: refundRequest.id,
          body: {
            id: refundRequest.id,
            reason: "Seller response",
            requested_at: refundRequest.requested_at,
            refund_window_expires_at: refundRequest.refund_window_expires_at,
            customer: refundRequest.customer,
            seller: refundRequest.seller,
            order_item: refundRequest.orderItem,
            created_at: refundRequest.created_at,
            updated_at: refundRequest.updated_at,
          } satisfies IEcommerceRefundRequest.IResponse,
        },
      );
    },
  );
}
