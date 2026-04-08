import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDateRange";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequestSnapshot";
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
import { generate_random_ecommerce_mall_member_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_mall_member_cancellation_requests_create";
import { generate_random_ecommerce_mall_member_orders_create } from "../../../generate/generate_random_ecommerce_mall_member_orders_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_order_item } from "../../../prepare/prepare_random_ecommerce_mall_order_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_cancellation_request_snapshots_approved_response(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  // 2. Register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 3. Create product as seller
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
      },
    },
  );
  typia.assert(product);
  // 4. Create shipping address for customer
  const shippingAddress: IEcommerceMallCustomerAddress.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    street: RandomGenerator.paragraph({ sentences: 1 }),
    city: RandomGenerator.alphabets(5),
    state: RandomGenerator.alphabets(4),
    postal_code: RandomGenerator.alphaNumeric(6),
    country: RandomGenerator.alphabets(2),
    is_default: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  // 5. Customer creates order with the product
  const order = await api.functional.ecommerceMall.member.orders.create(
    customerConnection,
    {
      body: {
        shipping_address_id: shippingAddress.id,
        order_items: [
          {
            product_variant_id: product.variants[0].id,
            quantity: 1,
          },
        ],
      },
    },
  );
  typia.assert(order);
  // 6. Customer creates cancellation request for order item
  const cancellationRequest =
    await api.functional.ecommerceMall.member.cancellation_requests.create(
      customerConnection,
      {
        body: {
          order_item_id: order.items[0].id,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(cancellationRequest);
  // 7. Seller approves the cancellation request
  const approvedCancellationRequest =
    await api.functional.ecommerceMall.seller.cancellation_requests.update(
      sellerConnection,
      {
        id: cancellationRequest.id,
        body: {
          status: "approved",
        },
      },
    );
  typia.assert(approvedCancellationRequest);
  // 8. Query cancellation request snapshots with approved filter
  const snapshots =
    await api.functional.ecommerceMall.member.cancellation_request_snapshots.index(
      customerConnection,
      {
        body: {
          response_status: "approved",
        },
      },
    );
  typia.assert(snapshots);
  // 9. Validate snapshot exists and contains correct data
  const foundSnapshot = snapshots.data.find(
    (s) =>
      s.cancellationRequest.id === cancellationRequest.id &&
      s.approved_at !== undefined,
  );
  TestValidator.predicate(
    "approved snapshot exists",
    foundSnapshot !== undefined,
  );
  if (foundSnapshot) {
    typia.assert(foundSnapshot);
    // Validate approval timestamp is present
    TestValidator.predicate(
      "approval timestamp present",
      foundSnapshot.approved_at !== undefined,
    );
    // Validate seller rejection reason is null
    TestValidator.equals(
      "seller rejection reason is null",
      foundSnapshot.seller_rejection_reason ?? null,
      null,
    );
    // Validate snapshot contains order item information
    TestValidator.equals(
      "order item ID matches",
      foundSnapshot.cancellationRequest.item.id,
      order.items[0].id,
    );
    // Validate snapshot contains order details
    TestValidator.equals(
      "order ID matches",
      foundSnapshot.cancellationRequest.order.id,
      order.id,
    );
    // Validate snapshot contains seller information
    TestValidator.equals(
      "seller ID matches",
      foundSnapshot.cancellationRequest.seller.id,
      product.seller.id,
    );
    // Validate pagination metadata
    TestValidator.predicate(
      "pagination has records",
      snapshots.pagination.records >= 1,
    );
    TestValidator.equals(
      "pagination current page is 1",
      snapshots.pagination.current,
      1,
    );
  }
}
