import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPostPurchaseRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPostPurchaseRefundRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPostPurchaseRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseRefundRequest";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test that a seller receives an empty list when no post-purchase refund requests exist.
 *
 * Validates the refund request listing endpoint returns an empty result set when a seller has no refund requests for their products. This test ensures proper pagination metadata is returned even with zero records, and that the response structure remains valid.
 *
 * The test creates a seller account and a product, but deliberately does not create any orders or refund requests. This isolates the test to verify the empty state behavior of the refund requests listing endpoint.
 *
 * 1. Seller account is created and authenticated via authorize_seller_join.
 * 2. Seller creates a product using generate_random_shopping_mall_seller_products_create.
 * 3. Seller calls PATCH /shoppingMall/seller/post-purchase/refund-requests with empty request body.
 * 4. Validates response structure via typia.assert().
 * 5. Validates data array is empty and pagination metadata shows zero records.
 */
export async function test_api_post_purchase_refund_request_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 2. Create a product (no orders placed, no refund requests exist)
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Call refund requests endpoint with empty request body
  const response =
    await api.functional.shoppingMall.seller.post_purchase.refund_requests.index(
      sellerConnection,
      {
        body: {} satisfies IShoppingMallPostPurchaseRefundRequest.IRequest,
      },
    );
  typia.assert(response);
  // 4. Validate response structure and empty data
  TestValidator.equals("data array is empty", response.data.length, 0);
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.predicate("limit is positive", response.pagination.limit > 0);
  TestValidator.equals("records count is 0", response.pagination.records, 0);
  TestValidator.equals("pages count is 0", response.pagination.pages, 0);
}
