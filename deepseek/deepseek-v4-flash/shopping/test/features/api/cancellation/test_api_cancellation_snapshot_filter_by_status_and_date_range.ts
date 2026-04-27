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
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallCancellationRequestSnapshot";
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
import { generate_random_e_commerce_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_e_commerce_mall_customer_cancellation_requests_create";
import { generate_random_e_commerce_mall_customer_cart_items_create } from "../../../generate/generate_random_e_commerce_mall_customer_cart_items_create";
import { generate_random_e_commerce_mall_customer_orders_create } from "../../../generate/generate_random_e_commerce_mall_customer_orders_create";
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { generate_random_e_commerce_mall_seller_products_variants_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_create";
import { generate_random_e_commerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_inventory_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_cancellation_snapshot_filter_by_status_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Setup actor-specific connections
  const adminConnection: api.IConnection = { host: connection.host };
  const sellerConnection: api.IConnection = { host: connection.host };
  const customerConnection: api.IConnection = { host: connection.host };
  // 1. Join administrator
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Join seller
  await authorize_seller_join(sellerConnection, {});
  // 3. Join customer
  await authorize_customer_join(customerConnection, {});
  // 4. Seller creates product
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 5. Seller creates variant
  const variant =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 6. Seller adds inventory (restock)
  await generate_random_e_commerce_mall_seller_products_variants_inventory_create(
    sellerConnection,
    {
      params: {
        productId: product.id,
        variantId: variant.id,
      },
      body: {
        quantity_change: 100,
        reason: "Initial restock",
      },
    },
  );
  // 7. Customer creates a shipping address
  const address =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // 8. Customer adds variant to cart (first order)
  await generate_random_e_commerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        product_variant_id: variant.id,
        quantity: 2,
      },
    },
  );
  // 9. Customer places first order
  const order1 = await generate_random_e_commerce_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        addressId: address.id,
      },
    },
  );
  typia.assert(order1);
  const firstOrderItemId = order1.orderItems[0]!.id;
  // 10. Customer creates cancellation request #1 (to be approved)
  const cancelReq1 =
    await generate_random_e_commerce_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: firstOrderItemId,
          reason: "Found a better price elsewhere",
        },
      },
    );
  typia.assert(cancelReq1);
  // 11. Seller approves cancellation #1 -> snapshot created with status='approved'
  const beforeResponse = new Date();
  await api.functional.eCommerceMall.seller.cancellation_requests.update(
    sellerConnection,
    {
      cancellationRequestId: cancelReq1.id,
      body: {
        status: "approved",
      } satisfies IECommerceMallCancellationRequest.IUpdate,
    },
  );
  const afterResponse = new Date();
  // 12. Customer adds variant to cart again (second order)
  await generate_random_e_commerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        product_variant_id: variant.id,
        quantity: 1,
      },
    },
  );
  // 13. Customer places second order
  const order2 = await generate_random_e_commerce_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        addressId: address.id,
      },
    },
  );
  typia.assert(order2);
  const secondOrderItemId = order2.orderItems[0]!.id;
  // 14. Customer creates cancellation request #2 (to be rejected)
  const cancelReq2 =
    await generate_random_e_commerce_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: secondOrderItemId,
          reason: "Item no longer fits my needs",
        },
      },
    );
  typia.assert(cancelReq2);
  // 15. Seller rejects cancellation #2 -> snapshot created with status='rejected'
  await api.functional.eCommerceMall.seller.cancellation_requests.update(
    sellerConnection,
    {
      cancellationRequestId: cancelReq2.id,
      body: {
        status: "rejected",
        rejection_reason: "Already prepared for shipment - cannot cancel",
      } satisfies IECommerceMallCancellationRequest.IUpdate,
    },
  );
  // === Test Steps as Administrator ===
  // 16a. Filter by status 'approved' for cancellation A
  const approvedResult =
    await api.functional.eCommerceMall.administrator.cancellation_requests.snapshots.index(
      adminConnection,
      {
        cancellationRequestId: cancelReq1.id,
        body: {
          status: "approved",
        } satisfies IECommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(approvedResult);
  TestValidator.equals(
    "approved snapshot count",
    approvedResult.data.length,
    1,
  );
  TestValidator.equals(
    "approved snapshot status",
    approvedResult.data[0]?.status,
    "approved",
  );
  TestValidator.equals(
    "approved snapshot reason",
    approvedResult.data[0]?.reason,
    "Found a better price elsewhere",
  );
  // 16b. Filter by status 'rejected' for cancellation B
  const rejectedResult =
    await api.functional.eCommerceMall.administrator.cancellation_requests.snapshots.index(
      adminConnection,
      {
        cancellationRequestId: cancelReq2.id,
        body: {
          status: "rejected",
        } satisfies IECommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(rejectedResult);
  TestValidator.equals(
    "rejected snapshot count",
    rejectedResult.data.length,
    1,
  );
  TestValidator.equals(
    "rejected snapshot status",
    rejectedResult.data[0]?.status,
    "rejected",
  );
  TestValidator.equals(
    "rejected snapshot reason",
    rejectedResult.data[0]?.reason,
    "Item no longer fits my needs",
  );
  // 16c. Filter by date range (within response window)
  const fromStr = new Date(
    beforeResponse.getTime() - 5 * 60 * 1000,
  ).toISOString();
  const toStr = new Date(afterResponse.getTime() + 5 * 60 * 1000).toISOString();
  const dateRangeResult =
    await api.functional.eCommerceMall.administrator.cancellation_requests.snapshots.index(
      adminConnection,
      {
        cancellationRequestId: cancelReq1.id,
        body: {
          from: fromStr,
          to: toStr,
        } satisfies IECommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.equals(
    "date range snapshot count",
    dateRangeResult.data.length,
    1,
  );
  // 16d. Non-matching future dates -> empty result
  const futureResult =
    await api.functional.eCommerceMall.administrator.cancellation_requests.snapshots.index(
      adminConnection,
      {
        cancellationRequestId: cancelReq1.id,
        body: {
          from: "2099-01-01T00:00:00.000Z",
        } satisfies IECommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(futureResult);
  TestValidator.equals("future date data length", futureResult.data.length, 0);
  TestValidator.equals(
    "future date pagination records",
    futureResult.pagination.records,
    0,
  );
  // 16e. Pagination test with page=1, limit=1
  const pageResult =
    await api.functional.eCommerceMall.administrator.cancellation_requests.snapshots.index(
      adminConnection,
      {
        cancellationRequestId: cancelReq1.id,
        body: {
          page: 1,
          limit: 1,
        } satisfies IECommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(pageResult);
  TestValidator.equals("pagination current", pageResult.pagination.current, 1);
  TestValidator.equals("pagination records", pageResult.pagination.records, 1);
  TestValidator.equals("pagination pages", pageResult.pagination.pages, 1);
  // 16f. Non-existent cancellation request ID -> HTTP 404
  await TestValidator.httpError(
    "non-existent cancellation request",
    404,
    async () => {
      await api.functional.eCommerceMall.administrator.cancellation_requests.snapshots.index(
        adminConnection,
        {
          cancellationRequestId: typia.random<string & tags.Format<"uuid">>(),
          body: {} satisfies IECommerceMallCancellationRequestSnapshot.IRequest,
        },
      );
    },
  );
}
