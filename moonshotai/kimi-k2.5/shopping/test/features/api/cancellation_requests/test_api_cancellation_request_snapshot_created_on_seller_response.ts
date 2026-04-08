import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequestSnapshot";
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
import { generate_random_ecommerce_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_cancellation_requests_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

/**
 * Test that seller response creates a new snapshot visible in the snapshot list.
 *
 * This validates the snapshot creation mechanism when seller responds to a request:
 * 1. Authenticate as customer and seller
 * 2. Seller creates product and variant for transaction context
 * 3. Customer creates a cancellation request (generates initial PENDING snapshot)
 * 4. Seller responds by rejecting the request with a reason
 * 5. System automatically creates a new snapshot capturing the response state
 * 6. Seller retrieves snapshots and verifies at least 2 snapshots exist
 * 7. Verify the latest snapshot captures the new status (APPROVED/REJECTED)
 * 8. Verify response reason is preserved when rejected
 */
export async function test_api_cancellation_request_snapshot_created_on_seller_response(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies DeepPartial<
      import("@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller").IEcommerceMallSeller.IJoin
    >,
  });
  typia.assert(sellerAuth);
  // 2. Create customer account and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies DeepPartial<
      import("@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer").IEcommerceMallCustomer.IJoin
    >,
  });
  typia.assert(customerAuth);
  // 3. Seller creates a product
  const product: IEcommerceMallProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          basePrice: randint(1000, 50000),
        } satisfies DeepPartial<IEcommerceMallProduct.ICreate>,
      },
    );
  typia.assert(product);
  // 4. Seller creates a variant for the product
  const variant: IEcommerceMallProductVariant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(10),
          price: randint(1000, 50000),
          options: [
            {
              optionName: "Color",
              optionValue: RandomGenerator.pick([
                "Red",
                "Blue",
                "Green",
                "Black",
              ]),
            },
          ],
        } satisfies DeepPartial<IEcommerceMallProductVariant.ICreate>,
      },
    );
  typia.assert(variant);
  // 5. Customer creates a cancellation request
  const cancellationRequest: IEcommerceMallCancellationRequest =
    await generate_random_ecommerce_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies DeepPartial<IEcommerceMallCancellationRequest.ICreate>,
      },
    );
  typia.assert(cancellationRequest);
  TestValidator.equals(
    "Initial status is pending",
    cancellationRequest.status,
    "pending",
  );
  // 6. Seller responds to the cancellation request (rejecting with a reason to verify snapshot preservation)
  const responseReason = RandomGenerator.paragraph({ sentences: 2 });
  const sellerResponse: IEcommerceMallCancellationRequest =
    await api.functional.ecommerceMall.seller.cancellation_requests.update(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          status: "rejected",
          responseReason: responseReason,
        } satisfies IEcommerceMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(sellerResponse);
  TestValidator.equals(
    "Status is rejected after seller response",
    sellerResponse.status,
    "rejected",
  );
  // 7. Seller retrieves snapshots for the cancellation request
  const snapshots: IPageIEcommerceMallCancellationRequestSnapshot.ISummary =
    await api.functional.ecommerceMall.seller.cancellation_requests.snapshots.index(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          page: 1,
          limit: 20,
          createdAtFrom: null,
          createdAtTo: null,
          statusBefore: null,
          statusAfter: null,
          sortField: "created_at",
          sortOrder: "desc",
        } satisfies import("@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot").IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 8. Verify snapshot count - should have at least 2 snapshots
  TestValidator.predicate(
    "At least 2 snapshots exist (initial + response)",
    snapshots.data.length >= 2,
  );
  // 9. Verify the latest snapshot (most recent) captures the response state
  const latestSnapshot = snapshots.data[0];
  TestValidator.equals(
    "Latest snapshot statusBefore is pending",
    latestSnapshot.statusBefore,
    "pending",
  );
  TestValidator.equals(
    "Latest snapshot statusAfter is rejected",
    latestSnapshot.statusAfter,
    "rejected",
  );
  // 10. Verify response reason is preserved in reviewerNote
  TestValidator.equals(
    "Response reason preserved in reviewerNote",
    latestSnapshot.reviewerNote,
    responseReason,
  );
}
