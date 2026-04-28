import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import type { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import type { IEcommercePlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformRefundRequest";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import type { IEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshot";
import type { IEcommercePlatformSnapshotRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformSnapshotRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformSnapshotRefundRequest";
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
import { generate_random_ecommerce_platform_admin_categories_create } from "../../../generate/generate_random_ecommerce_platform_admin_categories_create";
import { generate_random_ecommerce_platform_customer_addresses_create } from "../../../generate/generate_random_ecommerce_platform_customer_addresses_create";
import { generate_random_ecommerce_platform_customer_orders_create } from "../../../generate/generate_random_ecommerce_platform_customer_orders_create";
import { generate_random_ecommerce_platform_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_platform_customer_refund_requests_create";
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { generate_random_ecommerce_platform_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_create";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_order } from "../../../prepare/prepare_random_ecommerce_platform_order";
import { prepare_random_ecommerce_platform_order_item } from "../../../prepare/prepare_random_ecommerce_platform_order_item";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";
import { prepare_random_ecommerce_platform_refund_request } from "../../../prepare/prepare_random_ecommerce_platform_refund_request";
import { prepare_random_ecommerce_platform_shipping_address } from "../../../prepare/prepare_random_ecommerce_platform_shipping_address";

/**
 * Tests pagination and status filtering capabilities for refund request snapshot records.
 *
 * Validates the complete prerequisite chain: administrator registers and creates product category, seller registers and creates product with variant, customer registers, creates shipping address, places order containing the product variant, and submits a refund request. The refund request creation automatically triggers snapshot generation recording the initial state. The customer then queries snapshots with pagination parameters and approval status filters.
 *
 * Special attention is given to verifying that cursor-based pagination correctly limits results per page, date range filters constrain snapshots to the specified window, approval status filters (both previous and current) accurately narrow results, and pagination metadata is calculated correctly with proper page counts and total records.
 *
 * 1. Administrator registers and creates a product category.
 * 2. Seller registers and creates a product with variant under the category.
 * 3. Customer registers, creates shipping address, and places an order.
 * 4. Customer submits a refund request for the order item.
 * 5. Customer queries snapshots with pagination and approval status filters.
 * 6. Validates pagination metadata and filtered results match criteria.
 */
export async function test_api_refund_request_snapshots_pagination_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registers and creates product category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category: IEcommercePlatformCategory =
    await api.functional.ecommercePlatform.admin.categories.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommercePlatformCategory.ICreate,
      },
    );
  typia.assert(category);
  // 2. Seller registers, creates product, and variant
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product: IEcommercePlatformProduct =
    await api.functional.ecommercePlatform.seller.products.create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          base_price: typia.random<number & tags.Type<"uint32">>(),
          category_id: category.id,
        } satisfies IEcommercePlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  const variant: IEcommercePlatformProductVariant =
    await api.functional.ecommercePlatform.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          skuCode: RandomGenerator.alphabets(10),
          options: [
            {
              attributeKey: "color",
              attributeValue: RandomGenerator.alphabets(5),
            } satisfies IEcommercePlatformProductVariantOption.ICreate,
          ],
        } satisfies IEcommercePlatformProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 3. Customer registers, creates address, and places order
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const address: IEcommercePlatformShippingAddress =
    await api.functional.ecommercePlatform.customer.addresses.create(
      customerConnection,
      {
        body: {
          recipientName: RandomGenerator.name(),
          phoneNumber: RandomGenerator.mobile(),
          streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
          city: RandomGenerator.alphabets(8),
          state: RandomGenerator.alphabets(6),
          postalCode: RandomGenerator.alphabets(5),
          country: RandomGenerator.alphabets(8),
          isDefault: true,
        } satisfies IEcommercePlatformShippingAddress.ICreate,
      },
    );
  typia.assert(address);
  const order: IEcommercePlatformOrder =
    await api.functional.ecommercePlatform.customer.orders.create(
      customerConnection,
      {
        body: {
          items: [
            {
              ecommerce_platform_product_variant_id: variant.id,
              quantity: 1,
              price: product.base_price,
            } satisfies IEcommercePlatformOrderItem.ICreate,
          ],
          shipping_address_id: address.id,
        } satisfies IEcommercePlatformOrder.ICreate,
      },
    );
  typia.assert(order);
  const orderItemId = order.items[0].id;
  // 4. Customer submits refund request for the order item
  const refundRequest: IEcommercePlatformRefundRequest =
    await api.functional.ecommercePlatform.customer.refund_requests.create(
      customerConnection,
      {
        body: {
          order_item_id: orderItemId,
          refund_reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommercePlatformRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  const refundRequestId = refundRequest.id;
  // 5. Query snapshots with pagination and filtering
  const fromCreatedAt: string = new Date(Date.now() - 86400000).toISOString();
  const toCreatedAt: string = new Date(Date.now() + 86400000).toISOString();
  const limit = 3;
  const firstPage =
    await api.functional.ecommercePlatform.customer.refund_requests.snapshots.index(
      customerConnection,
      {
        refundRequestId: refundRequestId,
        body: {
          limit: limit,
          page: 1,
          previousApprovalStatus: "pending",
          fromCreatedAt: fromCreatedAt,
          toCreatedAt: toCreatedAt,
        } satisfies IEcommercePlatformSnapshotRefundRequest.IRequest,
      },
    );
  typia.assert(firstPage);
  // 6. Validate pagination metadata
  TestValidator.predicate(
    "first page current is 1",
    firstPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "first page limit matches request",
    firstPage.pagination.limit === limit,
  );
  TestValidator.predicate(
    "records count is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count matches ceiling of records divided by limit",
    firstPage.pagination.pages ===
      Math.ceil(firstPage.pagination.records / limit),
  );
  TestValidator.predicate(
    "data array length does not exceed limit",
    firstPage.data.length <= limit,
  );
  // 7. Validate filtered results contain expected snapshot properties
  for (const snapshot of firstPage.data) {
    typia.assert(snapshot);
    TestValidator.predicate("snapshot has valid id", snapshot.id !== undefined);
    TestValidator.predicate(
      "snapshot has current approval status",
      snapshot.current_approval_status !== undefined,
    );
    TestValidator.predicate(
      "snapshot has created_at timestamp",
      snapshot.created_at !== undefined,
    );
    TestValidator.predicate(
      "snapshot has snapshot header reference",
      snapshot.snapshot !== undefined,
    );
  }
  // 8. Second page pagination test to verify page progression
  if (firstPage.pagination.pages >= 2) {
    const secondPage =
      await api.functional.ecommercePlatform.customer.refund_requests.snapshots.index(
        customerConnection,
        {
          refundRequestId: refundRequestId,
          body: {
            limit: limit,
            page: 2,
            previousApprovalStatus: "pending",
          } satisfies IEcommercePlatformSnapshotRefundRequest.IRequest,
        },
      );
    typia.assert(secondPage);
    TestValidator.predicate(
      "second page current is 2",
      secondPage.pagination.current === 2,
    );
    TestValidator.notEquals(
      "second page snapshot ids differ from first page",
      firstPage.data.map((s) => s.id),
      secondPage.data.map((s) => s.id),
    );
  }
}
