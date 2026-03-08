import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller retrieving list of order items needing shipping.
 *
 * 1. Register and authenticate a seller
 * 2. Retrieve order items with 'paid' status needing shipping
 * 3. Validate response structure and pagination metadata
 * 4. Verify order items contain required shipping information
 */
export async function test_api_shipment_needs_shipping_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Retrieve order items needing shipping
  const response: IPageIEcommerceMallOrderItem.ISummary =
    await api.functional.ecommerceMall.seller.shipments.needs_shipping.index(
      sellerConnection,
      {
        body: {
          status: "paid",
          page: 1,
          limit: 20,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Validate order item summaries if present
  if (response.data.length > 0) {
    const item = response.data[0];
    typia.assert(item);
    // Validate business logic: status must be 'paid' (filtering criteria)
    TestValidator.equals("item status is paid", item.status, "paid");
    TestValidator.predicate("item quantity positive", item.quantity > 0);
    TestValidator.predicate("item unit price positive", item.unitPrice > 0);
    // Validate nested order summary
    TestValidator.predicate("order has valid ID", item.order.id.length > 0);
    TestValidator.predicate(
      "order has order number",
      item.order.orderNumber.length > 0,
    );
    TestValidator.predicate("order has total price", item.order.totalPrice > 0);
    // Validate product variant summary
    TestValidator.predicate(
      "variant has valid ID",
      item.productVariant.id.length > 0,
    );
    TestValidator.predicate(
      "variant has SKU code",
      item.productVariant.sku_code.length > 0,
    );
    TestValidator.predicate(
      "variant has stock quantity",
      item.productVariant.stock_quantity >= 0,
    );
  }
}