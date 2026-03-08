import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequestSnapshot";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_checkout_create } from "../../../generate/generate_random_shopping_mall_customer_checkout_create";
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_refund_request_snapshot_filter_by_refund_request(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - create product and variant
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // Get a category ID (required for product creation)
  // Since we can't query categories directly, we'll use a generated UUID
  // In real implementation, this would come from existing category data
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph(),
        categoryId: categoryId,
        basePrice: typia.random<
          number & tags.Minimum<1000> & tags.Maximum<100000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(8),
          optionValues: {
            color: RandomGenerator.pick(["red", "blue", "green"] as const),
          },
          price: typia.random<
            number & tags.Minimum<1000> & tags.Maximum<100000>
          >(),
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 2. Customer setup - create address, add to cart, checkout
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        street_address: RandomGenerator.paragraph({ sentences: 1 }),
        city: "Seoul",
        state_province: "Seoul",
        postal_code: "06000",
        country: "South Korea",
        is_default: true,
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(address);
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variant_id: variant.id,
          quantity: 1,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  const order = await generate_random_shopping_mall_customer_checkout_create(
    customerConnection,
    {
      body: { address_id: address.id } satisfies IShoppingMallCheckout.ICreate,
    },
  );
  typia.assert(order);
  // 3. Create shipment and confirm delivery
  // Note: Order item IDs are created internally during checkout
  // For this test, we'll work with the order structure
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        order_id: order.id,
        order_item_ids: [typia.random<string & tags.Format<"uuid">>()],
        carrier_name: "FedEx",
        tracking_number: RandomGenerator.alphaNumeric(12),
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  const deliveredShipment =
    await api.functional.shoppingMall.customer.shipments.delivery.confirmDelivery(
      customerConnection,
      { shipmentId: shipment.id },
    );
  typia.assert(deliveredShipment);
  // 4. Customer creates refund request
  const refundReason =
    "Product does not match description. The color is different from what was shown in the photos and the material quality is not as advertised.";
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: shipment.orderItems[0]!.id,
          reason: refundReason,
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // 5. Seller responds to refund request (creates snapshot)
  const updatedRefundRequest =
    await api.functional.shoppingMall.seller.refund_requests.update(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          decision: "approve",
        } satisfies IShoppingMallRefundRequest.IUpdate,
      },
    );
  typia.assert(updatedRefundRequest);
  // 6. Query snapshots filtered by refund request ID
  const snapshotPage =
    await api.functional.shoppingMall.seller.refund_request_snapshots.index(
      sellerConnection,
      {
        body: {
          shoppingMallRefundRequestId: refundRequest.id,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotPage);
  // 7. Validate results
  TestValidator.predicate("page has data", snapshotPage.data.length > 0);
  TestValidator.predicate(
    "all snapshots reference same refund request",
    snapshotPage.data.every(
      (snapshot) => snapshot.refundRequest.id === refundRequest.id,
    ),
  );
  TestValidator.predicate(
    "snapshot preserves original reason text",
    snapshotPage.data.some((snapshot) => snapshot.reason === refundReason),
  );
  TestValidator.predicate(
    "snapshot status is approved or rejected",
    snapshotPage.data.every(
      (snapshot) =>
        snapshot.status === "approved" || snapshot.status === "rejected",
    ),
  );
  // Validate pagination
  TestValidator.equals(
    "pagination current page is 1",
    snapshotPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    snapshotPage.pagination.limit,
    10,
  );
  // Validate refundRequest summary structure
  const firstSnapshot = snapshotPage.data[0]!;
  TestValidator.equals(
    "refundRequest summary has correct id",
    firstSnapshot.refundRequest.id,
    refundRequest.id,
  );
  TestValidator.predicate(
    "refundRequest summary has reason",
    typeof firstSnapshot.refundRequest.reason === "string",
  );
  TestValidator.predicate(
    "refundRequest summary has status",
    typeof firstSnapshot.refundRequest.status === "string",
  );
  TestValidator.predicate(
    "refundRequest summary has created_at",
    typeof firstSnapshot.refundRequest.created_at === "string",
  );
  TestValidator.predicate(
    "refundRequest summary has orderItem",
    firstSnapshot.refundRequest.orderItem !== null,
  );
  TestValidator.predicate(
    "refundRequest summary has order",
    firstSnapshot.refundRequest.order !== null,
  );
  TestValidator.predicate(
    "refundRequest summary has customer",
    firstSnapshot.refundRequest.customer !== null,
  );
  TestValidator.predicate(
    "refundRequest summary has seller",
    firstSnapshot.refundRequest.seller !== null,
  );
}
