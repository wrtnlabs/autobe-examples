import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
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
 * Test that an administrator can browse all cancellation request snapshots with pagination.
 *
 * Validates the complete cancellation request snapshot browsing flow including administrative authentication, seller product setup, customer order placement, cancellation request creation, seller responses (approve and reject), and snapshot verification. Ensures that snapshots correctly capture status transitions and include all required metadata.
 *
 * Special attention is given to verifying that snapshots are properly sorted by creation date (newest first), pagination metadata is accurate, and each snapshot contains the correct status_before, status_after, seller_response, and related entity information.
 *
 * 1. Administrator, customer, and seller accounts are registered and authenticated.
 * 2. Seller creates a product with a variant that has initial inventory.
 * 3. Customer places an order containing the product variant.
 * 4. Customer creates a cancellation request for the first order item.
 * 5. Seller approves the first cancellation request, creating a snapshot with status transition from 'pending' to 'approved'.
 * 6. Customer creates another order and cancellation request.
 * 7. Seller rejects the second cancellation request, creating a snapshot with status transition from 'pending' to 'rejected'.
 * 8. Administrator browses all snapshots with pagination and verifies data accuracy.
 */
export async function test_api_cancellation_request_snapshot_administrator_browse(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Seller1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Customer1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 5. Seller creates a variant with inventory
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          variantOptions: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
          initialStockQuantity: 10,
        },
      },
    );
  typia.assert(variant);
  // 6. Customer places first order
  const firstOrder = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {},
  );
  typia.assert(firstOrder);
  // 7. Customer creates first cancellation request
  const firstCancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: firstOrder.items[0].id,
          reason:
            "Customer wants to cancel this order item due to change of mind.",
        },
      },
    );
  typia.assert(firstCancellationRequest);
  // 8. Seller approves first cancellation request (creates snapshot)
  await api.functional.shoppingMall.seller.cancellation_requests.update(
    sellerConnection,
    {
      cancellationRequestId: firstCancellationRequest.id,
      body: {
        status: "approved",
        response_reason: "Seller approved the cancellation request.",
      } satisfies IShoppingMallCancellationRequest.IUpdate,
    },
  );
  // 9. Customer places second order
  const secondOrder = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {},
  );
  typia.assert(secondOrder);
  // 10. Customer creates second cancellation request
  const secondCancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: secondOrder.items[0].id,
          reason:
            "Customer wants to cancel this order item due to wrong selection.",
        },
      },
    );
  typia.assert(secondCancellationRequest);
  // 11. Seller rejects second cancellation request (creates snapshot)
  await api.functional.shoppingMall.seller.cancellation_requests.update(
    sellerConnection,
    {
      cancellationRequestId: secondCancellationRequest.id,
      body: {
        status: "rejected",
        response_reason:
          "Seller rejected the cancellation request as item already prepared.",
      } satisfies IShoppingMallCancellationRequest.IUpdate,
    },
  );
  // 12. Administrator browses all snapshots (page 1)
  const firstPageResponse =
    await api.functional.shoppingMall.administrator.cancellation_requests.snapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(firstPageResponse);
  // 13. Verify pagination metadata
  TestValidator.equals(
    "total records",
    firstPageResponse.pagination.records,
    2,
  );
  TestValidator.equals("current page", firstPageResponse.pagination.current, 1);
  TestValidator.equals("limit", firstPageResponse.pagination.limit, 20);
  TestValidator.equals("total pages", firstPageResponse.pagination.pages, 1);
  // 14. Verify snapshot count
  TestValidator.equals("snapshot count", firstPageResponse.data.length, 2);
  // 15. Verify snapshots are sorted by created_at descending (newest first)
  TestValidator.predicate(
    "snapshots sorted descending",
    firstPageResponse.data[0].created_at >=
      firstPageResponse.data[1].created_at,
  );
  // 16. Verify first snapshot (should be the rejected one, created later)
  const firstSnapshot = firstPageResponse.data[0];
  TestValidator.equals(
    "first snapshot status_before",
    firstSnapshot.status_before,
    "pending",
  );
  TestValidator.equals(
    "first snapshot status_after",
    firstSnapshot.status_after,
    "rejected",
  );
  TestValidator.predicate(
    "first snapshot has seller_response",
    firstSnapshot.seller_response !== null,
  );
  // 17. Verify second snapshot (should be the approved one, created earlier)
  const secondSnapshot = firstPageResponse.data[1];
  TestValidator.equals(
    "second snapshot status_before",
    secondSnapshot.status_before,
    "pending",
  );
  TestValidator.equals(
    "second snapshot status_after",
    secondSnapshot.status_after,
    "approved",
  );
  TestValidator.predicate(
    "second snapshot has seller_response",
    secondSnapshot.seller_response !== null,
  );
  // 18. Test pagination with page 2 (should return empty)
  const secondPageResponse =
    await api.functional.shoppingMall.administrator.cancellation_requests.snapshots.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 1,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(secondPageResponse);
  TestValidator.equals(
    "page 2 records",
    secondPageResponse.pagination.records,
    2,
  );
  TestValidator.equals(
    "page 2 current",
    secondPageResponse.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", secondPageResponse.pagination.limit, 1);
  TestValidator.equals("page 2 pages", secondPageResponse.pagination.pages, 2);
  TestValidator.equals("page 2 data length", secondPageResponse.data.length, 0);
  // 19. Test pagination with limit 1
  const limitedPageResponse =
    await api.functional.shoppingMall.administrator.cancellation_requests.snapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(limitedPageResponse);
  TestValidator.equals(
    "limited page data length",
    limitedPageResponse.data.length,
    1,
  );
  TestValidator.equals(
    "limited page total pages",
    limitedPageResponse.pagination.pages,
    2,
  );
}
