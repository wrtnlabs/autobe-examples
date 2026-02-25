import api from "@ORGANIZATION/PROJECT-api";
import { tags } from "typia";
import typia from "typia";
import { TestValidator } from "@nestia/e2e";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import type { IShoppingMallProductReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewSnapshot";

export async function test_api_product_review_snapshots_filter_no_results(
  connection: api.IConnection,
): Promise<void> {
  // Create seller actor connection and join
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, { body: {} });
  typia.assert(sellerAuthorized);

  // Create customer actor connection and join
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(customerConnection, { body: {} });
  typia.assert(customerAuthorized);

  // Despite the dependencies listed, this test scenario is about filtering with no results
  // So we do NOT create any product, variant, order item, review or snapshot instances.
  // Just call the productReviewSnapshots.index with filters that do not match any record.
  const filterRequest: IShoppingMallProductReviewSnapshot.IRequest = {
    // Use assumed random UUIDs that do not exist in the system
    productReviewId: typia.random<string & tags.Format<"uuid">>(),
    orderItemId: typia.random<string & tags.Format<"uuid">>(),
    productVariantId: typia.random<string & tags.Format<"uuid">>(),
    ratingMin: 5,
    ratingMax: 5,
    page: 1,
    limit: 10,
  };

  const response = await api.functional.shoppingMall.productReviewSnapshots.index(customerConnection, {
    body: filterRequest,
  });

  typia.assert(response);

  TestValidator.equals("data array empty", response.data.length, 0);
  TestValidator.equals("pagination records count", response.pagination.records, 0);
  TestValidator.equals("pagination pages count", response.pagination.pages, 0);
  TestValidator.equals("pagination current page", response.pagination.current, 1);
  TestValidator.equals("pagination limit", response.pagination.limit, 10);
}
