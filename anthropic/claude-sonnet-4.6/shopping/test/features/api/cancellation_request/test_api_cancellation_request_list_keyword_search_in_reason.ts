import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import type { IShoppingMallProductSnapshotSkus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkus";
import type { IShoppingMallProductSnapshotSkusOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkusOption";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
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
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_customer_orders_items_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_customer_orders_items_cancellation_requests_create";
import { generate_random_shopping_mall_seller_approvals_create } from "../../../generate/generate_random_shopping_mall_seller_approvals_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_records_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_seller_approval } from "../../../prepare/prepare_random_shopping_mall_seller_approval";

export async function test_api_cancellation_request_list_keyword_search_in_reason(
  connection: api.IConnection,
): Promise<void> {
  // ── 1. Register customer ──────────────────────────────────────────────
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // ── 2. Register seller ───────────────────────────────────────────────
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // ── 3. Register admin ────────────────────────────────────────────────
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // ── 4. Seller submits approval ────────────────────────────────────────
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(approval);
  // ── 5. Admin creates category ─────────────────────────────────────────
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    { body: {} },
  );
  typia.assert(category);
  // ── 6. Admin approves seller ──────────────────────────────────────────
  const approvedApproval =
    await api.functional.shoppingMall.admin.sellerApprovals.update(
      adminConnection,
      {
        approvalId: approval.id,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IShoppingMallSellerApproval.IUpdate,
      },
    );
  typia.assert(approvedApproval);
  // ── 7. Seller creates product ─────────────────────────────────────────
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  // ── 8. Seller creates variantA ────────────────────────────────────────
  const variantA =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {},
      },
    );
  typia.assert(variantA);
  // ── 9. Seller adds inventory for variantA ─────────────────────────────
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerConnection,
    {
      params: { productId: product.id, variantId: variantA.id },
      body: { quantity: 10 },
    },
  );
  // ── 10. Seller creates variantB ───────────────────────────────────────
  const variantB =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {},
      },
    );
  typia.assert(variantB);
  // ── 11. Seller adds inventory for variantB ────────────────────────────
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerConnection,
    {
      params: { productId: product.id, variantId: variantB.id },
      body: { quantity: 10 },
    },
  );
  // ── 12. Customer adds variantA to cart ────────────────────────────────
  await generate_random_shopping_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        product_variant_id: variantA.id,
        quantity: 1,
      },
    },
  );
  // ── 13. Customer places first order (variantA) ────────────────────────
  const firstOrder = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        items: [
          {
            product_variant_id: variantA.id,
            quantity: 1,
          },
        ],
      },
    },
  );
  typia.assert(firstOrder);
  const firstOrderItem = firstOrder.items[0];
  typia.assertGuard(firstOrderItem!);
  // ── 14. Customer submits first cancellation request ───────────────────
  const firstCancellation =
    await generate_random_shopping_mall_customer_orders_items_cancellation_requests_create(
      customerConnection,
      {
        params: {
          orderId: firstOrder.id,
          orderItemId: firstOrderItem.id,
        },
        body: {
          reason: "defective product received",
        },
      },
    );
  typia.assert(firstCancellation);
  // ── 15. Customer adds variantB to cart ────────────────────────────────
  await generate_random_shopping_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        product_variant_id: variantB.id,
        quantity: 1,
      },
    },
  );
  // ── 16. Customer places second order (variantB) ───────────────────────
  const secondOrder =
    await generate_random_shopping_mall_customer_orders_create(
      customerConnection,
      {
        body: {
          items: [
            {
              product_variant_id: variantB.id,
              quantity: 1,
            },
          ],
        },
      },
    );
  typia.assert(secondOrder);
  const secondOrderItem = secondOrder.items[0];
  typia.assertGuard(secondOrderItem!);
  // ── 17. Customer submits second cancellation request ──────────────────
  const secondCancellation =
    await generate_random_shopping_mall_customer_orders_items_cancellation_requests_create(
      customerConnection,
      {
        params: {
          orderId: secondOrder.id,
          orderItemId: secondOrderItem.id,
        },
        body: {
          reason: "found better price elsewhere",
        },
      },
    );
  typia.assert(secondCancellation);
  // ── Test 1: Search by 'defective' ──────────────────────────────────────
  const defectiveResult =
    await api.functional.shoppingMall.customer.cancellationRequests.index(
      customerConnection,
      {
        body: {
          search: "defective",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(defectiveResult);
  TestValidator.equals(
    "defective search records count",
    defectiveResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "defective search data length",
    defectiveResult.data.length,
    1,
  );
  TestValidator.predicate(
    "defective result reason contains 'defective'",
    defectiveResult.data[0]!.reason.includes("defective"),
  );
  // ── Test 2: Search by 'price' ─────────────────────────────────────────
  const priceResult =
    await api.functional.shoppingMall.customer.cancellationRequests.index(
      customerConnection,
      {
        body: {
          search: "price",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(priceResult);
  TestValidator.equals(
    "price search records count",
    priceResult.pagination.records,
    1,
  );
  TestValidator.equals("price search data length", priceResult.data.length, 1);
  TestValidator.predicate(
    "price result reason contains 'price'",
    priceResult.data[0]!.reason.includes("price"),
  );
  // ── Test 3: No search filter returns both ─────────────────────────────
  const allResult =
    await api.functional.shoppingMall.customer.cancellationRequests.index(
      customerConnection,
      {
        body: {} satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(allResult);
  TestValidator.equals(
    "no filter returns both records",
    allResult.pagination.records,
    2,
  );
  // ── Test 4: Nonexistent keyword returns empty ─────────────────────────
  const emptyResult =
    await api.functional.shoppingMall.customer.cancellationRequests.index(
      customerConnection,
      {
        body: {
          search: "nonexistent_keyword_xyz",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "nonexistent keyword returns 0 records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "nonexistent keyword returns empty data array",
    emptyResult.data.length,
    0,
  );
}
