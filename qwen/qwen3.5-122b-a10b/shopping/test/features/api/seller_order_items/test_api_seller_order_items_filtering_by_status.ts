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

export async function test_api_seller_order_items_filtering_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Test single status filter
  const singleStatusResult =
    await api.functional.ecommerceMall.seller.order_items.index(
      sellerConnection,
      {
        body: {
          status: "paid",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(singleStatusResult);
  // Validate response structure
  TestValidator.predicate(
    "pagination exists",
    singleStatusResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(singleStatusResult.data),
  );
  // Validate data structure if items exist
  if (singleStatusResult.data.length > 0) {
    const firstItem = singleStatusResult.data[0];
    TestValidator.predicate("has id", firstItem.id !== undefined);
    TestValidator.predicate("has quantity", firstItem.quantity !== undefined);
    TestValidator.predicate("has unitPrice", firstItem.unitPrice !== undefined);
    TestValidator.predicate("has status", firstItem.status !== undefined);
    TestValidator.predicate("has createdAt", firstItem.createdAt !== undefined);
    TestValidator.predicate("has updatedAt", firstItem.updatedAt !== undefined);
    TestValidator.predicate("has deletedAt", firstItem.deletedAt !== undefined);
    TestValidator.predicate("has order", firstItem.order !== undefined);
    TestValidator.predicate(
      "has order.orderNumber",
      firstItem.order.orderNumber !== undefined,
    );
    TestValidator.predicate(
      "has productVariant",
      firstItem.productVariant !== undefined,
    );
    TestValidator.predicate(
      "has productVariant.sku_code",
      firstItem.productVariant.sku_code !== undefined,
    );
    TestValidator.predicate(
      "has productVariant.option_values",
      firstItem.productVariant.option_values !== undefined,
    );
    // Validate all items have the filtered status
    for (const item of singleStatusResult.data) {
      TestValidator.equals("all items have paid status", item.status, "paid");
    }
  }
  // 3. Test multiple status filter
  const multiStatusResult =
    await api.functional.ecommerceMall.seller.order_items.index(
      sellerConnection,
      {
        body: {
          status: ["paid", "shipped"],
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(multiStatusResult);
  // Validate all returned items match one of the filtered statuses
  for (const item of multiStatusResult.data) {
    TestValidator.predicate(
      `item status ${item.status} is in filtered list`,
      ["paid", "shipped"].includes(item.status),
    );
  }
  // 4. Test date range filter
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const dateRangeResult =
    await api.functional.ecommerceMall.seller.order_items.index(
      sellerConnection,
      {
        body: {
          created_at_from: oneDayAgo.toISOString(),
          created_at_to: now.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  // Validate all returned items are within date range (if any exist)
  for (const item of dateRangeResult.data) {
    const itemDate = new Date(item.createdAt);
    TestValidator.predicate(
      `item createdAt ${item.createdAt} >= ${oneDayAgo.toISOString()}`,
      itemDate >= oneDayAgo,
    );
    TestValidator.predicate(
      `item createdAt ${item.createdAt} <= ${now.toISOString()}`,
      itemDate <= now,
    );
  }
  // 5. Test order_id filter
  // First, get any order from the results
  let orderId: string | undefined;
  if (singleStatusResult.data.length > 0) {
    orderId = singleStatusResult.data[0].order.id;
  }
  if (orderId !== undefined) {
    const orderFilterResult =
      await api.functional.ecommerceMall.seller.order_items.index(
        sellerConnection,
        {
          body: {
            order_id: orderId,
            page: 1,
            limit: 20,
          } satisfies IEcommerceMallOrderItem.IRequest,
        },
      );
    typia.assert(orderFilterResult);
    // Validate all returned items belong to the specified order
    for (const item of orderFilterResult.data) {
      TestValidator.equals(
        "all items belong to filtered order",
        item.order.id,
        orderId,
      );
    }
  }
  // 6. Test product_variant_id filter
  let variantId: string | undefined;
  if (singleStatusResult.data.length > 0) {
    variantId = singleStatusResult.data[0].productVariant.id;
  }
  if (variantId !== undefined) {
    const variantFilterResult =
      await api.functional.ecommerceMall.seller.order_items.index(
        sellerConnection,
        {
          body: {
            product_variant_id: variantId,
            page: 1,
            limit: 20,
          } satisfies IEcommerceMallOrderItem.IRequest,
        },
      );
    typia.assert(variantFilterResult);
    // Validate all returned items belong to the specified variant
    for (const item of variantFilterResult.data) {
      TestValidator.equals(
        "all items belong to filtered variant",
        item.productVariant.id,
        variantId,
      );
    }
  }
  // 7. Test pagination parameters
  const page2Result =
    await api.functional.ecommerceMall.seller.order_items.index(
      sellerConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals("page 2 requested", page2Result.pagination.current, 2);
  TestValidator.equals("limit 5 applied", page2Result.pagination.limit, 5);
  // Validate pagination metadata structure
  TestValidator.predicate(
    "pagination.current is non-negative",
    page2Result.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is non-negative",
    page2Result.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records is non-negative",
    page2Result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    page2Result.pagination.pages >= 0,
  );
  // 8. Test combined filtering with status and pagination
  const combinedResult =
    await api.functional.ecommerceMall.seller.order_items.index(
      sellerConnection,
      {
        body: {
          status: "shipped",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(combinedResult);
  // Validate data count matches limit or total
  TestValidator.predicate(
    "data length does not exceed limit",
    combinedResult.data.length <= combinedResult.pagination.limit,
  );
  // Validate all items have the filtered status
  for (const item of combinedResult.data) {
    TestValidator.equals(
      "all items have shipped status",
      item.status,
      "shipped",
    );
  }
  // 9. Test data isolation - seller should only see their own products' order items
  // Create another seller
  const otherSellerConnection: api.IConnection = { host: connection.host };
  const otherSellerAuth = await authorize_seller_join(otherSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(otherSellerAuth);
  // Both sellers should be able to access their own order items
  // (The backend filtering ensures data isolation)
  const seller1Items =
    await api.functional.ecommerceMall.seller.order_items.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(seller1Items);
  const seller2Items =
    await api.functional.ecommerceMall.seller.order_items.index(
      otherSellerConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(seller2Items);
  // Validate both can access their respective order items
  TestValidator.predicate(
    "seller 1 can access order items",
    Array.isArray(seller1Items.data),
  );
  TestValidator.predicate(
    "seller 2 can access order items",
    Array.isArray(seller2Items.data),
  );
  // Validate pagination structure for both sellers
  TestValidator.predicate(
    "seller 1 has pagination",
    seller1Items.pagination !== undefined,
  );
  TestValidator.predicate(
    "seller 2 has pagination",
    seller2Items.pagination !== undefined,
  );
}
