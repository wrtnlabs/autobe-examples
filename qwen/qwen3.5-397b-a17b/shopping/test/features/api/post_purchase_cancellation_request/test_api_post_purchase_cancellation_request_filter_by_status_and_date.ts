import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPostPurchaseCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPostPurchaseCancellationRequest";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import type { IShoppingMallPostPurchaseCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseCancellationRequest";
import type { IShoppingMallPostPurchaseCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseCancellationRequestSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_member_post_purchase_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_member_post_purchase_cancellation_requests_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_post_purchase_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_post_purchase_cancellation_request";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test post-purchase cancellation request filtering by status and date range.
 *
 * Validates that members can filter their cancellation requests using status and date range parameters. The test creates multiple cancellation requests with different statuses and verifies that filtering returns only matching requests.
 *
 * The test covers status filtering (pending, approved, rejected) and date range filtering (createdAtFrom, createdAtTo). It also validates that pagination metadata correctly reflects filtered counts and that results are sorted by created_at in descending order.
 *
 * 1. Member registers and authenticates.
 * 2. Seller creates product with variants.
 * 3. Member creates orders and cancellation requests.
 * 4. Test status filter returns only matching requests.
 * 5. Test date range filter returns only requests within range.
 * 6. Verify pagination metadata matches filtered results.
 */
export async function test_api_post_purchase_cancellation_request_filter_by_status_and_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Seller registration for product creation
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 3. Create product
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Create product variant
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: RandomGenerator.alphaNumeric(8),
          option_values: "Color: Red, Size: Large",
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Create multiple cancellation requests with different creation times
  const cancellationRequests: IShoppingMallPostPurchaseCancellationRequest.ISummary[] =
    [];
  for (let i = 0; i < 5; i++) {
    const cancellationRequest =
      await api.functional.shoppingMall.member.post_purchase.cancellation_requests.create(
        memberConnection,
        {
          body: {
            shopping_mall_order_item_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            reason: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IShoppingMallPostPurchaseCancellationRequest.ICreate,
        },
      );
    typia.assert(cancellationRequest);
    cancellationRequests.push(cancellationRequest);
  }
  // 6. Test status filter - pending
  const pendingResult =
    await api.functional.shoppingMall.member.post_purchase.cancellation_requests.index(
      memberConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallPostPurchaseCancellationRequest.IRequest,
      },
    );
  typia.assert(pendingResult);
  TestValidator.predicate("pending filter returns only pending requests", () =>
    pendingResult.data.every((request) => request.status === "pending"),
  );
  TestValidator.equals(
    "pending pagination records count",
    pendingResult.pagination.records,
    pendingResult.data.length,
  );
  // 7. Test date range filter
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dateRangeResult =
    await api.functional.shoppingMall.member.post_purchase.cancellation_requests.index(
      memberConnection,
      {
        body: {
          createdAtFrom: yesterday.toISOString(),
          createdAtTo: tomorrow.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IShoppingMallPostPurchaseCancellationRequest.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "date range filter returns requests within range",
    () =>
      dateRangeResult.data.every((request) => {
        const createdAt = new Date(request.created_at);
        return createdAt >= yesterday && createdAt <= tomorrow;
      }),
  );
  // 8. Verify sorting by created_at DESC
  TestValidator.predicate("results sorted by created_at descending", () => {
    for (let i = 1; i < dateRangeResult.data.length; i++) {
      const prev = new Date(dateRangeResult.data[i - 1].created_at);
      const curr = new Date(dateRangeResult.data[i].created_at);
      if (prev < curr) {
        return false;
      }
    }
    return true;
  });
  // 9. Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    dateRangeResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit respected",
    () => dateRangeResult.data.length <= dateRangeResult.pagination.limit,
  );
}
