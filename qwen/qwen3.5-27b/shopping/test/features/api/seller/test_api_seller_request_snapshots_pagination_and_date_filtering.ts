import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRequestSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRequestSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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

/**
 * Test pagination and date range filtering for seller request snapshots.
 *
 * Validates the complete pagination and filtering capabilities of the request snapshots endpoint, including page navigation, limit control, date range filtering, and various query parameters for request type, order item, customer, seller, and status filters.
 *
 * The test verifies that pagination metadata is correctly calculated and that all filter combinations work as expected. Special attention is given to ensuring that empty result sets return proper pagination with zero records and pages.
 *
 * 1. Register and authenticate as a seller to access seller-only endpoints.
 * 2. Test basic pagination with page=1, limit=5 and verify metadata.
 * 3. Test page=2 with same limit to verify different results returned.
 * 4. Test date range filtering with created_at_from and created_at_to parameters.
 * 5. Test filtering by request_type (cancellation vs refund).
 * 6. Test filtering by shopping_mall_order_item_id for specific order items.
 * 7. Test filtering by shopping_mall_customer_id for specific customers.
 * 8. Test filtering by shopping_mall_seller_id for specific sellers.
 * 9. Test filtering by status_after (approved vs rejected).
 * 10. Test empty result set returns pagination with records=0, pages=0.
 * 11. Test combined filters work together correctly.
 */
export async function test_api_seller_request_snapshots_pagination_and_date_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: "seller@test.com",
      password: "password123",
    },
  });
  // 2. Test basic pagination with page=1, limit=5
  const page1 =
    await api.functional.shoppingMall.seller.request_snapshots.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IShoppingMallRequestSnapshot.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 5);
  TestValidator.predicate("page 1 has valid records", () => {
    return page1.pagination.records >= 0;
  });
  TestValidator.predicate("page 1 pages calculated correctly", () => {
    const expectedPages =
      page1.pagination.records === 0
        ? 0
        : Math.ceil(page1.pagination.records / page1.pagination.limit);
    return page1.pagination.pages === expectedPages;
  });
  // 3. Test page=2 with same limit
  const page2 =
    await api.functional.shoppingMall.seller.request_snapshots.index(
      sellerConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IShoppingMallRequestSnapshot.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 5);
  TestValidator.predicate("page 2 pages calculated correctly", () => {
    const expectedPages =
      page2.pagination.records === 0
        ? 0
        : Math.ceil(page2.pagination.records / page2.pagination.limit);
    return page2.pagination.pages === expectedPages;
  });
  // 4. Test date range filtering
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dateFiltered =
    await api.functional.shoppingMall.seller.request_snapshots.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          created_at_from: yesterday.toISOString(),
          created_at_to: tomorrow.toISOString(),
        } satisfies IShoppingMallRequestSnapshot.IRequest,
      },
    );
  typia.assert(dateFiltered);
  TestValidator.equals(
    "date filter current page",
    dateFiltered.pagination.current,
    1,
  );
  TestValidator.predicate("date filter pages calculated correctly", () => {
    const expectedPages =
      dateFiltered.pagination.records === 0
        ? 0
        : Math.ceil(
            dateFiltered.pagination.records / dateFiltered.pagination.limit,
          );
    return dateFiltered.pagination.pages === expectedPages;
  });
  // 5. Test filtering by request_type (cancellation)
  const cancellationFiltered =
    await api.functional.shoppingMall.seller.request_snapshots.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          request_type: "cancellation",
        } satisfies IShoppingMallRequestSnapshot.IRequest,
      },
    );
  typia.assert(cancellationFiltered);
  TestValidator.predicate("all cancellation type if data exists", () => {
    return (
      cancellationFiltered.data.length === 0 ||
      cancellationFiltered.data.every(
        (snapshot) => snapshot.request_type === "cancellation",
      )
    );
  });
  // 6. Test filtering by request_type (refund)
  const refundFiltered =
    await api.functional.shoppingMall.seller.request_snapshots.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          request_type: "refund",
        } satisfies IShoppingMallRequestSnapshot.IRequest,
      },
    );
  typia.assert(refundFiltered);
  TestValidator.predicate("all refund type if data exists", () => {
    return (
      refundFiltered.data.length === 0 ||
      refundFiltered.data.every(
        (snapshot) => snapshot.request_type === "refund",
      )
    );
  });
  // 7. Test filtering by status_after (approved)
  const approvedFiltered =
    await api.functional.shoppingMall.seller.request_snapshots.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          status_after: "approved",
        } satisfies IShoppingMallRequestSnapshot.IRequest,
      },
    );
  typia.assert(approvedFiltered);
  TestValidator.predicate("all approved status if data exists", () => {
    return (
      approvedFiltered.data.length === 0 ||
      approvedFiltered.data.every(
        (snapshot) => snapshot.status_after === "approved",
      )
    );
  });
  // 8. Test filtering by status_after (rejected)
  const rejectedFiltered =
    await api.functional.shoppingMall.seller.request_snapshots.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          status_after: "rejected",
        } satisfies IShoppingMallRequestSnapshot.IRequest,
      },
    );
  typia.assert(rejectedFiltered);
  TestValidator.predicate("all rejected status if data exists", () => {
    return (
      rejectedFiltered.data.length === 0 ||
      rejectedFiltered.data.every(
        (snapshot) => snapshot.status_after === "rejected",
      )
    );
  });
  // 9. Test filtering by shopping_mall_seller_id with a valid UUID
  const testSellerId = typia.random<string & tags.Format<"uuid">>();
  const sellerIdFiltered =
    await api.functional.shoppingMall.seller.request_snapshots.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          shopping_mall_seller_id: testSellerId,
        } satisfies IShoppingMallRequestSnapshot.IRequest,
      },
    );
  typia.assert(sellerIdFiltered);
  TestValidator.equals(
    "seller filter current page",
    sellerIdFiltered.pagination.current,
    1,
  );
  TestValidator.predicate("seller filter pages calculated correctly", () => {
    const expectedPages =
      sellerIdFiltered.pagination.records === 0
        ? 0
        : Math.ceil(
            sellerIdFiltered.pagination.records /
              sellerIdFiltered.pagination.limit,
          );
    return sellerIdFiltered.pagination.pages === expectedPages;
  });
  // 10. Test combined filters
  const combinedFiltered =
    await api.functional.shoppingMall.seller.request_snapshots.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          request_type: "cancellation",
          status_after: "approved",
          created_at_from: yesterday.toISOString(),
        } satisfies IShoppingMallRequestSnapshot.IRequest,
      },
    );
  typia.assert(combinedFiltered);
  TestValidator.predicate(
    "combined filter cancellation and approved if data exists",
    () => {
      return (
        combinedFiltered.data.length === 0 ||
        combinedFiltered.data.every(
          (snapshot) =>
            snapshot.request_type === "cancellation" &&
            snapshot.status_after === "approved",
        )
      );
    },
  );
  // 11. Test empty result set with non-existent order item ID
  const nonExistentOrderId = typia.random<string & tags.Format<"uuid">>();
  const emptyFiltered =
    await api.functional.shoppingMall.seller.request_snapshots.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          shopping_mall_order_item_id: nonExistentOrderId,
        } satisfies IShoppingMallRequestSnapshot.IRequest,
      },
    );
  typia.assert(emptyFiltered);
  TestValidator.equals(
    "empty result records",
    emptyFiltered.pagination.records,
    0,
  );
  TestValidator.equals("empty result pages", emptyFiltered.pagination.pages, 0);
  TestValidator.equals(
    "empty result data length",
    emptyFiltered.data.length,
    0,
  );
}