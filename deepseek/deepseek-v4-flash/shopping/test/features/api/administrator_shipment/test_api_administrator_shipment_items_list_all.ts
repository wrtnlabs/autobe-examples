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
import type { IECommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerApprovalRequest";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipment";
import type { IECommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallShipmentItem";
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
import { generate_random_e_commerce_mall_administrator_categories_create } from "../../../generate/generate_random_e_commerce_mall_administrator_categories_create";
import { generate_random_e_commerce_mall_customer_addresses_create } from "../../../generate/generate_random_e_commerce_mall_customer_addresses_create";
import { generate_random_e_commerce_mall_customer_cart_items_create } from "../../../generate/generate_random_e_commerce_mall_customer_cart_items_create";
import { generate_random_e_commerce_mall_customer_orders_create } from "../../../generate/generate_random_e_commerce_mall_customer_orders_create";
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { generate_random_e_commerce_mall_seller_products_variants_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_create";
import { generate_random_e_commerce_mall_seller_shipments_create } from "../../../generate/generate_random_e_commerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_administrator_shipment_items_list_all(
  connection: api.IConnection,
): Promise<void> {
  //----
  // 1. Create actor-specific connections
  //----
  const adminConnection: api.IConnection = { host: connection.host };
  const sellerConnection: api.IConnection = { host: connection.host };
  const customerConnection: api.IConnection = { host: connection.host };
  //----
  // 2. Register all actors
  //----
  const admin = await authorize_administrator_join(adminConnection, {
    body: typia.random<IECommerceMallAdministrator.IJoin>(),
  });
  typia.assert(admin);
  const seller = await authorize_seller_join(sellerConnection, {
    body: typia.random<IECommerceMallSeller.IJoin>(),
  });
  typia.assert(seller);
  const customer = await authorize_customer_join(customerConnection, {
    body: typia.random<IECommerceMallCustomer.IJoin>(),
  });
  typia.assert(customer);
  //----
  // 3. Admin creates a category
  //----
  const category =
    await generate_random_e_commerce_mall_administrator_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  //----
  // 4. Seller submits an approval request
  //----
  const approvalRequest =
    await api.functional.eCommerceMall.seller.approval_requests.create(
      sellerConnection,
    );
  typia.assert(approvalRequest);
  //----
  // 5. Admin approves the seller registration
  //----
  const approved =
    await api.functional.eCommerceMall.administrator.approval_requests.update(
      adminConnection,
      {
        requestId: approvalRequest.id,
        body: {
          status: "approved",
        } satisfies IECommerceMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(approved);
  //----
  // 6. Seller creates a product
  //----
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {
      body: { category_id: category.id },
    },
  );
  typia.assert(product);
  //----
  // 7. Seller creates a variant (SKU) with an option
  //----
  const variant =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  //----
  // 8. Customer creates a shipping address
  //----
  const address =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  //----
  // 9. Customer adds the variant to shopping cart
  //----
  const cartItem =
    await generate_random_e_commerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: { product_variant_id: variant.id },
      },
    );
  typia.assert(cartItem);
  //----
  // 10. Customer places an order (creates paid order items with snapshots)
  //----
  const order = await generate_random_e_commerce_mall_customer_orders_create(
    customerConnection,
    {
      body: { addressId: address.id },
    },
  );
  typia.assert(order);
  TestValidator.predicate(
    "order has at least one order item",
    order.orderItems.length >= 1,
  );
  const orderItem = order.orderItems[0]!;
  typia.assertGuard(orderItem);
  //----
  // 11. Seller creates a shipment containing the paid order item
  //----
  const shipment =
    await generate_random_e_commerce_mall_seller_shipments_create(
      sellerConnection,
      {
        body: { orderItemIds: [orderItem.id] },
      },
    );
  typia.assert(shipment);
  //----
  // 12. Administrator queries shipment items with default pagination
  //----
  const page =
    await api.functional.eCommerceMall.administrator.shipments.items.index(
      adminConnection,
      {
        shipmentId: shipment.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IECommerceMallShipmentItem.IRequest,
      },
    );
  typia.assert(page);
  //----
  // 13. Validate pagination metadata
  //----
  TestValidator.equals("current page", page.pagination.current, 1);
  TestValidator.equals("page limit", page.pagination.limit, 20);
  TestValidator.predicate(
    "total records count is at least 1",
    page.pagination.records >= 1,
  );
  TestValidator.predicate(
    "total pages count is at least 1",
    page.pagination.pages >= 1,
  );
  //----
  // 14. Validate shipment item data
  //----
  TestValidator.predicate(
    "data array has at least one item",
    page.data.length >= 1,
  );
  const shipmentItem = page.data[0]!;
  typia.assertGuard(shipmentItem);
  // Validate each item has expected fields from the order item summary
  TestValidator.equals(
    "status is shipped",
    shipmentItem.orderItem.status,
    "shipped",
  );
  TestValidator.predicate(
    "product_name is present",
    shipmentItem.orderItem.product_name.length > 0,
  );
  TestValidator.predicate(
    "variant_sku is present",
    shipmentItem.orderItem.variant_sku.length > 0,
  );
  TestValidator.predicate(
    "shop_name is present",
    shipmentItem.orderItem.shop_name.length > 0,
  );
  TestValidator.predicate(
    "quantity is positive",
    shipmentItem.orderItem.quantity >= 1,
  );
  TestValidator.predicate(
    "unit_price is positive",
    shipmentItem.orderItem.unit_price >= 0,
  );
  TestValidator.predicate(
    "subtotal is positive",
    shipmentItem.orderItem.subtotal >= 0,
  );
  // Validate createdAt is a valid date-time string
  TestValidator.predicate(
    "createdAt is a valid date-time string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(shipmentItem.createdAt),
  );
}
