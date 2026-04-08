import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshotProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotProductImage";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
import { generate_random_shopping_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_customer_cancellation_requests_create";
import { generate_random_shopping_mall_customer_checkout } from "../../../generate/generate_random_shopping_mall_customer_checkout";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test that a seller can view their cancellation request snapshots with pagination.
 *
 * Validates the complete cancellation request snapshot workflow including seller and customer registration, product creation, order placement, cancellation request creation, seller approval, and snapshot listing. Ensures that the snapshot correctly captures the status transition from pending to approved, includes the seller's response text, and provides accurate pagination metadata.
 *
 * Special attention is given to verifying that the snapshot contains the correct status_before and status_after values, the seller response reason, and proper references to both the seller and cancellation request entities.
 *
 * 1. Register and authenticate as a seller using authorize_seller_join
 * 2. Register and authenticate as a customer using authorize_customer_join
 * 3. Create a product with variant and inventory for the seller
 * 4. Customer creates an order containing the product variant
 * 5. Customer creates a cancellation request for the order item
 * 6. Seller approves the cancellation request (creates snapshot with status transition)
 * 7. Seller calls the snapshots endpoint with pagination parameters
 * 8. Verify the response contains the snapshot with correct status transition
 * 9. Verify the response includes seller information and cancellation request details
 * 10. Verify pagination metadata is correct (records=1, pages=1)
 */
export async function test_api_cancellation_request_snapshot_list_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(sellerAuth);
  // 2. Register and authenticate as a customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(customerAuth);
  // 3. Create a product for the seller
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 4. Create a variant with inventory for the product
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(10),
          variantOptions: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
          initialStockQuantity: 10,
        },
      },
    );
  typia.assert(variant);
  // 5. Customer creates an order containing the product variant
  // Note: The checkout function handles cart setup internally
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {},
  );
  typia.assert(order);
  // 6. Customer creates a cancellation request for an order item
  // Using the first item from the order
  const cancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: order.items[0].id,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(cancellationRequest);
  // 7. Verify cancellation request is in pending status
  TestValidator.equals(
    "cancellation request status is pending",
    cancellationRequest.status,
    "pending",
  );
  // 8. Seller approves the cancellation request (creates snapshot)
  const approvedRequest =
    await api.functional.shoppingMall.seller.cancellation_requests.update(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          status: "approved",
          response_reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  // 9. Verify approval was successful
  TestValidator.equals(
    "cancellation request approved",
    approvedRequest.status,
    "approved",
  );
  // 10. Seller calls the snapshots endpoint with pagination parameters
  const snapshotsResponse =
    await api.functional.shoppingMall.seller.cancellation_requests.snapshots.index(
      sellerConnection,
      {
        body: {
          sellerId: sellerAuth.id,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // 11. Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    snapshotsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    snapshotsResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "has snapshots",
    snapshotsResponse.pagination.records >= 1,
  );
  TestValidator.predicate(
    "has at least one page",
    snapshotsResponse.pagination.pages >= 1,
  );
  // 12. Verify snapshot data exists
  TestValidator.predicate(
    "snapshots array not empty",
    snapshotsResponse.data.length >= 1,
  );
  const snapshot = snapshotsResponse.data[0];
  typia.assert(snapshot);
  // 13. Verify snapshot contains correct status transition
  TestValidator.equals(
    "status before is pending",
    snapshot.status_before,
    "pending",
  );
  TestValidator.equals(
    "status after is approved",
    snapshot.status_after,
    "approved",
  );
  // 14. Verify seller response is present
  TestValidator.predicate(
    "seller response exists",
    snapshot.seller_response !== null,
  );
  if (snapshot.seller_response !== null) {
    TestValidator.predicate(
      "seller response not empty",
      snapshot.seller_response.length > 0,
    );
  }
  // 15. Verify seller information in snapshot
  TestValidator.equals(
    "snapshot seller matches",
    snapshot.seller.id,
    sellerAuth.id,
  );
  // 16. Verify cancellation request information in snapshot
  TestValidator.equals(
    "snapshot cancellation request matches",
    snapshot.cancellationRequest.id,
    cancellationRequest.id,
  );
  // 17. Verify timestamp exists
  TestValidator.predicate(
    "snapshot has created_at",
    snapshot.created_at.length > 0,
  );
}
