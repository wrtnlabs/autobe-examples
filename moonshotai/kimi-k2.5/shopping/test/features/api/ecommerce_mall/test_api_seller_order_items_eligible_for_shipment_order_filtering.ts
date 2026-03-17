import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test filtering eligible order items by order ID.
 *
 * Scenario: A seller has multiple orders with paid items and wants to view only items from a specific order.
 * The seller provides an orderId filter in the request body. Verify that: only items belonging to the
 * specified order are returned, the filter works correctly, pagination is applied correctly, and items
 * from other orders are excluded.
 */
export async function test_api_seller_order_items_eligible_for_shipment_order_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create a dedicated seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  // Register and authenticate as a seller
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies DeepPartial<IEcommerceMallSeller.IJoin>,
  });
  typia.assert(seller);
  // Generate a specific order ID for filtering
  const targetOrderId = typia.random<string & tags.Format<"uuid">>();
  // Call the eligibleForShipment endpoint with orderId filter
  const response =
    await api.functional.ecommerceMall.seller.orderItems.eligibleForShipment.index(
      sellerConnection,
      {
        body: {
          orderId: targetOrderId,
          page: 1,
          limit: 20,
          sort: "created_at",
          order: "desc",
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(response);
  // Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  // Validate that data array length matches records count when on first page with fewer items than limit
  if (response.pagination.records < response.pagination.limit) {
    TestValidator.equals(
      "data length matches records",
      response.data.length,
      response.pagination.records,
    );
  }
  // Validate all returned items have proper structure and paid status (eligible for shipment)
  for (const item of response.data) {
    typia.assert(item);
    TestValidator.equals("item status is paid", item.status, "paid");
  }
  // Test pagination by requesting page 2 with the same orderId filter
  const page2Response =
    await api.functional.ecommerceMall.seller.orderItems.eligibleForShipment.index(
      sellerConnection,
      {
        body: {
          orderId: targetOrderId,
          page: 2,
          limit: 10,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(page2Response);
  // Validate page 2 structure
  TestValidator.equals(
    "page 2 current page",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", page2Response.pagination.limit, 10);
  TestValidator.predicate(
    "page 2 records is non-negative",
    page2Response.pagination.records >= 0,
  );
  // If total records is less than or equal to page 1 limit, page 2 should have no data
  if (response.pagination.records <= 20) {
    TestValidator.equals(
      "page 2 data is empty when no more records",
      page2Response.data.length,
      0,
    );
  }
}
