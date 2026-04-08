import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallCustomerReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerReview";
import type { IEcommerceMallCustomerReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerReviewSnapshot";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReviewSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_member_orders_create } from "../../../generate/generate_random_ecommerce_mall_member_orders_create";
import { generate_random_ecommerce_mall_member_orders_items_reviews_create } from "../../../generate/generate_random_ecommerce_mall_member_orders_items_reviews_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_customer_review } from "../../../prepare/prepare_random_ecommerce_mall_customer_review";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_order_item } from "../../../prepare/prepare_random_ecommerce_mall_order_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_review_snapshot_authorization_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer A joins the platform
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerAJoin = await api.functional.ecommerceMall.auth.member.join(
    customerAConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password123!",
        display_name: RandomGenerator.name(),
        href: "http://example.com/join",
        referrer: "http://example.com",
      } satisfies IEcommerceMallMember.IJoin,
    },
  );
  typia.assert(customerAJoin);
  // 2. Seller joins the platform
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await api.functional.ecommerceMall.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password123!",
        display_name: RandomGenerator.name(),
        href: "http://example.com/join",
        referrer: "http://example.com",
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(sellerJoin);
  // 3. Seller creates a product
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Create a valid shipping address for the order
  const address: IEcommerceMallCustomerAddress.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    street: "123 Test Street",
    city: "Test City",
    state: "Test State",
    postal_code: "12345",
    country: "US",
    is_default: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  // 5. Customer A creates an order for the product
  const order = await api.functional.ecommerceMall.member.orders.create(
    customerAConnection,
    {
      body: {
        shipping_address_id: address.id,
        order_items: [
          {
            product_variant_id: product.variants[0].id,
            quantity: 1,
          } satisfies IEcommerceMallOrderItem.ICreate,
        ],
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // 6. Create a mock shipment with shipped status (since SDK doesn't provide shipment creation)
  // For testing, we create the shipment object directly and use it for confirm delivery
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  const shipment: IEcommerceMallShipment = {
    id: shipmentId,
    seller_id: sellerJoin.id,
    order_id: order.id,
    carrier: "Test Carrier",
    tracking_number: "TEST123456",
    status: "shipped",
    shipped_at: new Date().toISOString(),
    delivered_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    seller: {
      id: sellerJoin.id,
      email: sellerJoin.email,
      display_name: sellerJoin.display_name,
      approval_status: "approved",
      is_suspended: false,
      created_at: new Date().toISOString(),
    },
    shipment_items: [
      {
        id: typia.random<string & tags.Format<"uuid">>(),
        status: "shipped",
        quantity_shipped: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        shipment: {
          id: shipmentId,
          status: "shipped",
          carrier: "Test Carrier",
          tracking_number: "TEST123456",
          shipped_at: new Date().toISOString(),
          delivered_at: undefined,
          created_at: new Date().toISOString(),
          seller: {
            id: sellerJoin.id,
            email: sellerJoin.email,
            display_name: sellerJoin.display_name,
            approval_status: "approved",
            is_suspended: false,
            created_at: new Date().toISOString(),
          },
        },
        orderItem: order.items[0],
      },
    ],
  };
  // 7. Customer A confirms delivery
  const confirmedShipment =
    await api.functional.ecommerceMall.member.shipments.confirm_delivery.confirmDelivery(
      customerAConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // 8. Customer A creates a review
  const review =
    await api.functional.ecommerceMall.member.orders.items.reviews.create(
      customerAConnection,
      {
        orderId: order.id,
        itemId: order.items[0].id,
        body: {
          rating: 5,
          text: "Amazing product!",
        } satisfies IEcommerceMallCustomerReview.ICreate,
      },
    );
  typia.assert(review);
  // 9. Customer B joins as a separate account
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerBJoin = await api.functional.ecommerceMall.auth.member.join(
    customerBConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password123!",
        display_name: RandomGenerator.name(),
        href: "http://example.com/join",
        referrer: "http://example.com",
      } satisfies IEcommerceMallMember.IJoin,
    },
  );
  typia.assert(customerBJoin);
  // 10. Customer B attempts to access Customer A's review snapshots (should be forbidden)
  let httpError: api.HttpError | undefined = undefined;
  try {
    await api.functional.ecommerceMall.reviews.snapshots.retrieveSnapshots(
      customerBConnection,
      {
        reviewId: review.id,
      },
    );
    TestValidator.error("should return 403 Forbidden", () => {
      throw new Error("Expected 403 Forbidden but request succeeded");
    });
  } catch (error) {
    if (typia.is<api.HttpError>(error)) {
      httpError = error;
      TestValidator.equals("HTTP status is 403 Forbidden", error.status, 403);
      const message: string = error.message;
      TestValidator.predicate(
        "error response does not leak review content",
        !message.includes(review.text ?? "") &&
          !message.includes(review.customer_id ?? ""),
      );
      TestValidator.predicate(
        "error response does not reveal review existence",
        !message.toLowerCase().includes("review") ||
          !message.toLowerCase().includes("found"),
      );
    } else {
      throw error;
    }
  }
  TestValidator.predicate("authorization enforced", httpError !== undefined);
}
