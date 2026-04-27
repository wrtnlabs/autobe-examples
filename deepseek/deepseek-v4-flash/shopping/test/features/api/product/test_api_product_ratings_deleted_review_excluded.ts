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

export async function test_api_product_ratings_deleted_review_excluded(
  connection: api.IConnection,
): Promise<void> {
  //----
  // Create actor-specific connections
  //----
  const adminConnection: api.IConnection = { host: connection.host };
  const sellerConnection: api.IConnection = { host: connection.host };
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerBConnection: api.IConnection = { host: connection.host };
  //----
  // Setup: Administrator, Seller, Product, Variant, Stock
  //----
  // 1. Administrator joins
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Seller joins
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 3. Seller creates a product
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 4. Seller creates a variant
  const variant =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 5. Seller adds stock to the variant
  const inventory =
    await generate_random_e_commerce_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
          variantId: variant.id,
        },
      },
    );
  typia.assert(inventory);
  //----
  // Customer A: Purchase flow and 4-star review
  //----
  // 6. Customer A joins
  const customerA = await authorize_customer_join(customerAConnection, {});
  typia.assert(customerA);
  // 7. Customer A creates a shipping address
  const addressA =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerAConnection,
      {},
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
        },
      },
    );
  typia.assert(cartItemA);
  // 9. Customer A places order
  const orderA = await generate_random_e_commerce_mall_customer_orders_create(
    customerAConnection,
    {
      body: {
        addressId: addressA.id,
      },
    },
  );
  typia.assert(orderA);
  const orderItemA = orderA.orderItems[0];
  // 10. Seller creates shipment for Customer A's order items
  const shipmentA =
    await generate_random_e_commerce_mall_seller_shipments_create(
      sellerConnection,
      {
        body: {
          orderItemIds: [orderItemA.id],
        },
      },
    );
  typia.assert(shipmentA);
  // 11. Customer A confirms delivery
  const confirmedShipmentA =
    await api.functional.eCommerceMall.customer.shipments.update(
      customerAConnection,
      {
        shipmentId: shipmentA.id,
        body: {},
      },
    );
  typia.assert(confirmedShipmentA);
  // 12. Customer A writes a 4-star review
  const reviewA = await generate_random_e_commerce_mall_customer_reviews_create(
    customerAConnection,
    {
      body: {
        order_item_id: orderItemA.id,
        rating: 4,
        content: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(reviewA);
  //----
  // Customer B: Purchase flow, 2-star review, then delete it
  //----
  // 13. Customer B joins
  const customerB = await authorize_customer_join(customerBConnection, {});
  typia.assert(customerB);
  // 14. Customer B creates a shipping address
  const addressB =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerBConnection,
      {},
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
        },
      },
    );
  typia.assert(cartItemB);
  // 16. Customer B places order
  const orderB = await generate_random_e_commerce_mall_customer_orders_create(
    customerBConnection,
    {
      body: {
        addressId: addressB.id,
      },
    },
  );
  typia.assert(orderB);
  const orderItemB = orderB.orderItems[0];
  // 17. Seller creates shipment for Customer B's order items
  const shipmentB =
    await generate_random_e_commerce_mall_seller_shipments_create(
      sellerConnection,
      {
        body: {
          orderItemIds: [orderItemB.id],
        },
      },
    );
  typia.assert(shipmentB);
  // 18. Customer B confirms delivery
  const confirmedShipmentB =
    await api.functional.eCommerceMall.customer.shipments.update(
      customerBConnection,
      {
        shipmentId: shipmentB.id,
        body: {},
      },
    );
  typia.assert(confirmedShipmentB);
  // 19. Customer B writes a 2-star review
  const reviewB = await generate_random_e_commerce_mall_customer_reviews_create(
    customerBConnection,
    {
      body: {
        order_item_id: orderItemB.id,
        rating: 2,
        content: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(reviewB);
  // 20. Customer B deletes their review (it should be excluded from rating)
  await api.functional.eCommerceMall.customer.reviews.erase(
    customerBConnection,
    {
      reviewId: reviewB.id,
    },
  );
  //----
  // Validation: Administrator fetches product ratings
  //----
  // 21. Administrator retrieves the aggregated rating
  const ratings =
    await api.functional.eCommerceMall.administrator.products.ratings.at(
      adminConnection,
      {
        productId: product.id,
      },
    );
  typia.assert(ratings);
  // 22. Validate: only Customer A's review (rating=4) counts
  TestValidator.equals("average rating", ratings.averageRating, 4.0);
  TestValidator.equals("total review count", ratings.totalCount, 1);
}
