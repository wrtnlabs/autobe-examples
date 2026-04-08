import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
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
 * Test seller order item filtering by status.
 * Validates that the PATCH /ecommerceMall/seller/order-items endpoint
 * correctly filters order items by their fulfillment status.
 */
export async function test_api_seller_order_item_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 2. Test filtering by status 'paid'
  const paidResult =
    await api.functional.ecommerceMall.seller.order_items.index(
      sellerConnection,
      {
        body: {
          status: "paid",
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(paidResult);
  // Validate all returned items have status 'paid'
  TestValidator.predicate(
    "all items have status 'paid'",
    paidResult.data.every((item) => item.status === "paid"),
  );
  // 3. Test filtering by status 'shipped'
  const shippedResult =
    await api.functional.ecommerceMall.seller.order_items.index(
      sellerConnection,
      {
        body: {
          status: "shipped",
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(shippedResult);
  // Validate all returned items have status 'shipped'
  TestValidator.predicate(
    "all items have status 'shipped'",
    shippedResult.data.every((item) => item.status === "shipped"),
  );
  // 4. Test filtering by status 'delivered'
  const deliveredResult =
    await api.functional.ecommerceMall.seller.order_items.index(
      sellerConnection,
      {
        body: {
          status: "delivered",
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(deliveredResult);
  // Validate all returned items have status 'delivered'
  TestValidator.predicate(
    "all items have status 'delivered'",
    deliveredResult.data.every((item) => item.status === "delivered"),
  );
  // 5. Verify pagination consistency - data length should not exceed records
  TestValidator.predicate(
    "paid pagination valid",
    paidResult.data.length <= paidResult.pagination.records,
  );
  TestValidator.predicate(
    "shipped pagination valid",
    shippedResult.data.length <= shippedResult.pagination.records,
  );
  TestValidator.predicate(
    "delivered pagination valid",
    deliveredResult.data.length <= deliveredResult.pagination.records,
  );
}
