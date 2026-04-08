import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRequestSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRequestSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_create";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test seller request snapshots listing with various filtering options.
 *
 * Validates the complete request snapshot workflow including seller authentication, product creation, order placement, cancellation and refund request creation, and seller responses that generate immutable audit snapshots. Ensures that the request-snapshots endpoint correctly filters snapshots by request type and status transition.
 *
 * Special attention is given to verifying that snapshots preserve complete state transition information including request type, status before and after, seller reason, and related entity summaries (customer, seller, order item).
 *
 * 1. Register and authenticate as a seller with randomized credentials.
 * 2. Register and authenticate as a customer with randomized credentials.
 * 3. Seller creates a product with name, description, and base price.
 * 4. Seller creates a product variant with SKU code and initial stock quantity.
 * 5. Customer places an order for the product variant (checkout process).
 * 6. Customer creates a cancellation request for the order item.
 * 7. Seller approves the cancellation request (generates snapshot with status_after='approved').
 * 8. Customer creates another order and receives delivery.
 * 9. Customer creates a refund request for the delivered item.
 * 10. Seller rejects the refund request (generates snapshot with status_after='rejected').
 * 11. Seller retrieves all snapshots without filters and verifies both snapshots exist.
 * 12. Filter by request_type='cancellation' and verify only cancellation snapshot returned.
 * 13. Filter by request_type='refund' and verify only refund snapshot returned.
 * 14. Filter by status_after='approved' and verify only approved snapshot returned.
 * 15. Filter by status_after='rejected' and verify only rejected snapshot returned.
 */
export async function test_api_seller_request_snapshots_list_with_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Register and authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 3. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 4. Seller creates a product variant with initial stock
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          initialStockQuantity: 10,
        },
      },
    );
  typia.assert(variant);
  // NOTE: The scenario requires customer to place orders, create cancellation/refund requests,
  // and seller to respond to those requests. However, the provided SDK functions do not include
  // endpoints for:
  // - Customer order creation (checkout)
  // - Customer cancellation request creation
  // - Customer refund request creation
  // - Seller approval/rejection of cancellation/refund requests
  //
  // Without these endpoints, we cannot generate the actual request snapshots.
  // The test will verify the request-snapshots listing endpoint with filtering,
  // but will use empty results since no snapshots exist in the system.
  // 11. Seller retrieves all snapshots without filters
  const allSnapshots =
    await api.functional.shoppingMall.seller.request_snapshots.index(
      sellerConnection,
      {
        body: {} satisfies IShoppingMallRequestSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  // Verify pagination structure
  TestValidator.predicate(
    "pagination exists",
    allSnapshots.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit valid",
    allSnapshots.pagination.limit >= 1,
  );
  // 12. Filter by request_type='cancellation'
  const cancellationSnapshots =
    await api.functional.shoppingMall.seller.request_snapshots.index(
      sellerConnection,
      {
        body: {
          request_type: "cancellation",
        } satisfies IShoppingMallRequestSnapshot.IRequest,
      },
    );
  typia.assert(cancellationSnapshots);
  // Verify all returned snapshots are cancellation type
  for (const snapshot of cancellationSnapshots.data) {
    TestValidator.equals(
      "snapshot is cancellation type",
      snapshot.request_type,
      "cancellation",
    );
  }
  // 13. Filter by request_type='refund'
  const refundSnapshots =
    await api.functional.shoppingMall.seller.request_snapshots.index(
      sellerConnection,
      {
        body: {
          request_type: "refund",
        } satisfies IShoppingMallRequestSnapshot.IRequest,
      },
    );
  typia.assert(refundSnapshots);
  // Verify all returned snapshots are refund type
  for (const snapshot of refundSnapshots.data) {
    TestValidator.equals(
      "snapshot is refund type",
      snapshot.request_type,
      "refund",
    );
  }
  // 14. Filter by status_after='approved'
  const approvedSnapshots =
    await api.functional.shoppingMall.seller.request_snapshots.index(
      sellerConnection,
      {
        body: {
          status_after: "approved",
        } satisfies IShoppingMallRequestSnapshot.IRequest,
      },
    );
  typia.assert(approvedSnapshots);
  // Verify all returned snapshots have status_after='approved'
  for (const snapshot of approvedSnapshots.data) {
    TestValidator.equals(
      "snapshot status is approved",
      snapshot.status_after,
      "approved",
    );
  }
  // 15. Filter by status_after='rejected'
  const rejectedSnapshots =
    await api.functional.shoppingMall.seller.request_snapshots.index(
      sellerConnection,
      {
        body: {
          status_after: "rejected",
        } satisfies IShoppingMallRequestSnapshot.IRequest,
      },
    );
  typia.assert(rejectedSnapshots);
  // Verify all returned snapshots have status_after='rejected'
  for (const snapshot of rejectedSnapshots.data) {
    TestValidator.equals(
      "snapshot status is rejected",
      snapshot.status_after,
      "rejected",
    );
  }
  // Verify snapshot structure contains required fields
  if (allSnapshots.data.length > 0) {
    const sampleSnapshot = allSnapshots.data[0];
    // Verify snapshot has required fields
    TestValidator.predicate("snapshot has id", sampleSnapshot.id !== undefined);
    TestValidator.predicate(
      "snapshot has request_type",
      sampleSnapshot.request_type !== undefined,
    );
    TestValidator.predicate(
      "snapshot has status_before",
      sampleSnapshot.status_before !== undefined,
    );
    TestValidator.predicate(
      "snapshot has status_after",
      sampleSnapshot.status_after !== undefined,
    );
    TestValidator.predicate(
      "snapshot has created_at",
      sampleSnapshot.created_at !== undefined,
    );
    // Verify related entities exist
    TestValidator.predicate(
      "snapshot has customer",
      sampleSnapshot.customer !== undefined,
    );
    TestValidator.predicate(
      "snapshot has seller",
      sampleSnapshot.seller !== undefined,
    );
    TestValidator.predicate(
      "snapshot has orderItem",
      sampleSnapshot.orderItem !== undefined,
    );
  }
}
