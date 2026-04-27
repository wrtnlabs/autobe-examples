import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequest";
import type { IECommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequestSnapshot";
import type { IECommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCartItem";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerAddress";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallInventoryRecord";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSellerSnapshot";
import type { IECommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSnapshot";
import type { IECommerceMallOrderItemStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemStatusLog";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import type { IECommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequest";
import type { IECommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequestSnapshot";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipment";
import type { IECommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_e_commerce_mall_customer_addresses_create } from "../../../generate/generate_random_e_commerce_mall_customer_addresses_create";
import { generate_random_e_commerce_mall_customer_cart_items_create } from "../../../generate/generate_random_e_commerce_mall_customer_cart_items_create";
import { generate_random_e_commerce_mall_customer_orders_create } from "../../../generate/generate_random_e_commerce_mall_customer_orders_create";
import { generate_random_e_commerce_mall_customer_reviews_create } from "../../../generate/generate_random_e_commerce_mall_customer_reviews_create";
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { generate_random_e_commerce_mall_seller_products_variants_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_create";
import { generate_random_e_commerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_inventory_create";
import { generate_random_e_commerce_mall_seller_shipments_create } from "../../../generate/generate_random_e_commerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_product_ratings_with_reviews(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Setup seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 3. Seller creates product
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        base_price: typia.random<
          number & tags.Minimum<1000> & tags.Maximum<100000>
        >(),
        category_id: null,
      } satisfies IECommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Seller creates variant
  const variant =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(10),
          options: [
            {
              key: "color",
              value: "Red",
            } satisfies IECommerceMallProductVariant.IOption,
          ],
        } satisfies IECommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Seller adds stock
  const inventoryRecord =
    await generate_random_e_commerce_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
          variantId: variant.id,
        },
        body: {
          quantity_change: 100,
          reason: "initial stock for testing",
        } satisfies IECommerceMallInventoryRecord.ICreate,
      },
    );
  typia.assert(inventoryRecord);
  // === Customer A: 5-star review ===
  // 6. Setup Customer A
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallCustomer.IJoin,
  });
  typia.assert(customerA);
  // 7. Customer A creates address
  const addressA =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerAConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          street_address: "123 Main Street",
          city: "Seoul",
          state_province: "Seoul",
          postal_code: "04524",
          country: "South Korea",
          is_default: true,
        } satisfies IECommerceMallCustomerAddress.ICreate,
      },
    );
  typia.assert(addressA);
  // 8. Customer A adds variant to cart
  const cartItemA =
    await generate_random_e_commerce_mall_customer_cart_items_create(
      customerAConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity: 1,
        } satisfies IECommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItemA);
  // 9. Customer A places order
  const orderA = await generate_random_e_commerce_mall_customer_orders_create(
    customerAConnection,
    {
      body: {
        addressId: addressA.id,
      } satisfies IECommerceMallOrder.ICreate,
    },
  );
  typia.assert(orderA);
  // 10. Seller creates shipment for Customer A's order items
  const orderItemIdA = orderA.orderItems[0].id;
  const shipmentA =
    await generate_random_e_commerce_mall_seller_shipments_create(
      sellerConnection,
      {
        body: {
          carrierName: "Test Carrier",
          trackingNumber: RandomGenerator.alphaNumeric(12),
          orderItemIds: [orderItemIdA],
        } satisfies IECommerceMallShipment.ICreate,
      },
    );
  typia.assert(shipmentA);
  // 11. Customer A confirms delivery
  const deliveredShipmentA =
    await api.functional.eCommerceMall.customer.shipments.update(
      customerAConnection,
      {
        shipmentId: shipmentA.id,
        body: {} satisfies IECommerceMallShipment.IUpdate,
      },
    );
  typia.assert(deliveredShipmentA);
  // 12. Customer A writes 5-star review
  const reviewA = await generate_random_e_commerce_mall_customer_reviews_create(
    customerAConnection,
    {
      body: {
        order_item_id: orderItemIdA,
        rating: 5,
        content: "Excellent product, highly recommended!",
      } satisfies IECommerceMallReview.ICreate,
    },
  );
  typia.assert(reviewA);
  // === Customer B: 3-star review ===
  // 13. Setup Customer B
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallCustomer.IJoin,
  });
  typia.assert(customerB);
  // 14. Customer B creates address
  const addressB =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerBConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          street_address: "456 Oak Avenue",
          city: "Busan",
          state_province: "Busan",
          postal_code: "48058",
          country: "South Korea",
          is_default: true,
        } satisfies IECommerceMallCustomerAddress.ICreate,
      },
    );
  typia.assert(addressB);
  // 15. Customer B adds variant to cart
  const cartItemB =
    await generate_random_e_commerce_mall_customer_cart_items_create(
      customerBConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity: 1,
        } satisfies IECommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItemB);
  // 16. Customer B places order
  const orderB = await generate_random_e_commerce_mall_customer_orders_create(
    customerBConnection,
    {
      body: {
        addressId: addressB.id,
      } satisfies IECommerceMallOrder.ICreate,
    },
  );
  typia.assert(orderB);
  // 17. Seller creates shipment for Customer B's order items
  const orderItemIdB = orderB.orderItems[0].id;
  const shipmentB =
    await generate_random_e_commerce_mall_seller_shipments_create(
      sellerConnection,
      {
        body: {
          carrierName: "Test Carrier",
          trackingNumber: RandomGenerator.alphaNumeric(12),
          orderItemIds: [orderItemIdB],
        } satisfies IECommerceMallShipment.ICreate,
      },
    );
  typia.assert(shipmentB);
  // 18. Customer B confirms delivery
  const deliveredShipmentB =
    await api.functional.eCommerceMall.customer.shipments.update(
      customerBConnection,
      {
        shipmentId: shipmentB.id,
        body: {} satisfies IECommerceMallShipment.IUpdate,
      },
    );
  typia.assert(deliveredShipmentB);
  // 19. Customer B writes 3-star review
  const reviewB = await generate_random_e_commerce_mall_customer_reviews_create(
    customerBConnection,
    {
      body: {
        order_item_id: orderItemIdB,
        rating: 3,
        content: "It's okay, but could be better.",
      } satisfies IECommerceMallReview.ICreate,
    },
  );
  typia.assert(reviewB);
  // 20. Administrator retrieves product ratings
  const ratings =
    await api.functional.eCommerceMall.administrator.products.ratings.at(
      adminConnection,
      {
        productId: product.id,
      },
    );
  typia.assert(ratings);
  // Validate rating aggregation
  // Both non-deleted reviews contribute: (5 + 3) / 2 = 4.0
  TestValidator.equals("average rating", ratings.averageRating, 4.0);
  TestValidator.equals("total review count", ratings.totalCount, 2);
}
