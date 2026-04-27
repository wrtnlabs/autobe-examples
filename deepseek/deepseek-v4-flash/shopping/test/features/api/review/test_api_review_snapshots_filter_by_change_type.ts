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
import type { IECommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReviewSnapshot";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipment";
import type { IECommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipmentItem";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallReviewSnapshot";
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
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
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

export async function test_api_review_snapshots_filter_by_change_type(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const superAdminConnection: api.IConnection = { host: connection.host };
  const sellerConnection: api.IConnection = { host: connection.host };
  const customerConnection: api.IConnection = { host: connection.host };
  // 1. Authenticate super admin
  await authorize_super_administrator_join(superAdminConnection, {});
  // 2. Register seller
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 3. Create a product
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 4. Create a variant
  const variant =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 5. Add inventory (restock)
  await generate_random_e_commerce_mall_seller_products_variants_inventory_create(
    sellerConnection,
    {
      params: {
        productId: product.id,
        variantId: variant.id,
      },
    },
  );
  // 6. Register customer
  await authorize_customer_join(customerConnection, {});
  // 7. Create a shipping address
  const address =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // 8. Add variant to cart
  await generate_random_e_commerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        product_variant_id: variant.id,
        quantity: 1,
      },
    },
  );
  // 9. Place order
  const order = await generate_random_e_commerce_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        addressId: address.id,
      },
    },
  );
  typia.assert(order);
  // 10. Get the order item ID (seller must ship it)
  const orderItemId = order.orderItems[0]!.id;
  // 11. Seller creates shipment
  const shipment =
    await generate_random_e_commerce_mall_seller_shipments_create(
      sellerConnection,
      {
        body: {
          orderItemIds: [orderItemId],
        },
      },
    );
  typia.assert(shipment);
  // 12. Customer confirms delivery
  await api.functional.eCommerceMall.customer.shipments.update(
    customerConnection,
    {
      shipmentId: shipment.id,
      body: {} satisfies IECommerceMallShipment.IUpdate,
    },
  );
  // 13. Customer writes initial review (creates 'created' snapshot: rating=4, text='Initial thoughts')
  const review = await generate_random_e_commerce_mall_customer_reviews_create(
    customerConnection,
    {
      body: {
        order_item_id: orderItemId,
        rating: 4,
        content: "Initial thoughts",
      },
    },
  );
  typia.assert(review);
  // 14. Edit review - rating only: rating=2, content unchanged
  //     Creates 'rating' snapshot: rating=4, text='Initial thoughts'
  const ratingEdit = await api.functional.eCommerceMall.customer.reviews.update(
    customerConnection,
    {
      reviewId: review.id,
      body: {
        rating: 2,
      } satisfies IECommerceMallReview.IUpdate,
    },
  );
  typia.assert(ratingEdit);
  // 15. Edit review - text only: content changed, rating unchanged
  //     Creates 'text' snapshot: rating=2, text='Initial thoughts'
  const textEdit = await api.functional.eCommerceMall.customer.reviews.update(
    customerConnection,
    {
      reviewId: review.id,
      body: {
        content: "Disappointing quality",
      } satisfies IECommerceMallReview.IUpdate,
    },
  );
  typia.assert(textEdit);
  // 16. Edit review - both: rating and content changed
  //     Creates 'rating_and_text' snapshot: rating=2, text='Disappointing quality'
  const bothEdit = await api.functional.eCommerceMall.customer.reviews.update(
    customerConnection,
    {
      reviewId: review.id,
      body: {
        rating: 4,
        content: "Decent after all",
      } satisfies IECommerceMallReview.IUpdate,
    },
  );
  typia.assert(bothEdit);
  // 17. Test 1: Filter by 'rating'
  {
    const result =
      await api.functional.eCommerceMall.superAdministrator.reviews.snapshots.index(
        superAdminConnection,
        {
          reviewId: review.id,
          body: {
            changed_fields: "rating",
          } satisfies IECommerceMallReviewSnapshot.IRequest,
        },
      );
    typia.assert(result);
    TestValidator.equals("rating filter count", result.data.length, 1);
    TestValidator.equals(
      "rating snapshot changed_fields",
      result.data[0]!.changed_fields,
      "rating",
    );
    TestValidator.equals("rating snapshot rating", result.data[0]!.rating, 4);
    TestValidator.equals(
      "rating snapshot text",
      result.data[0]!.text,
      "Initial thoughts",
    );
  }
  // 18. Test 2: Filter by 'text'
  {
    const result =
      await api.functional.eCommerceMall.superAdministrator.reviews.snapshots.index(
        superAdminConnection,
        {
          reviewId: review.id,
          body: {
            changed_fields: "text",
          } satisfies IECommerceMallReviewSnapshot.IRequest,
        },
      );
    typia.assert(result);
    TestValidator.equals("text filter count", result.data.length, 1);
    TestValidator.equals(
      "text snapshot changed_fields",
      result.data[0]!.changed_fields,
      "text",
    );
    TestValidator.equals("text snapshot rating", result.data[0]!.rating, 2);
    TestValidator.equals(
      "text snapshot text",
      result.data[0]!.text,
      "Initial thoughts",
    );
  }
  // 19. Test 3: Filter by 'rating_and_text'
  {
    const result =
      await api.functional.eCommerceMall.superAdministrator.reviews.snapshots.index(
        superAdminConnection,
        {
          reviewId: review.id,
          body: {
            changed_fields: "rating_and_text",
          } satisfies IECommerceMallReviewSnapshot.IRequest,
        },
      );
    typia.assert(result);
    TestValidator.equals("rating_and_text filter count", result.data.length, 1);
    TestValidator.equals(
      "rating_and_text snapshot changed_fields",
      result.data[0]!.changed_fields,
      "rating_and_text",
    );
    TestValidator.equals(
      "rating_and_text snapshot rating",
      result.data[0]!.rating,
      2,
    );
    TestValidator.equals(
      "rating_and_text snapshot text",
      result.data[0]!.text,
      "Disappointing quality",
    );
  }
  // 20. Test 4: Filter by 'created'
  {
    const result =
      await api.functional.eCommerceMall.superAdministrator.reviews.snapshots.index(
        superAdminConnection,
        {
          reviewId: review.id,
          body: {
            changed_fields: "created",
          } satisfies IECommerceMallReviewSnapshot.IRequest,
        },
      );
    typia.assert(result);
    TestValidator.equals("created filter count", result.data.length, 1);
    TestValidator.equals(
      "created snapshot changed_fields",
      result.data[0]!.changed_fields,
      "created",
    );
    TestValidator.equals("created snapshot rating", result.data[0]!.rating, 4);
    TestValidator.equals(
      "created snapshot text",
      result.data[0]!.text,
      "Initial thoughts",
    );
  }
  // 21. Test 5: No filter - expect all 4 snapshots
  {
    const result =
      await api.functional.eCommerceMall.superAdministrator.reviews.snapshots.index(
        superAdminConnection,
        {
          reviewId: review.id,
          body: {} satisfies IECommerceMallReviewSnapshot.IRequest,
        },
      );
    typia.assert(result);
    TestValidator.equals("no filter total count", result.data.length, 4);
  }
}
