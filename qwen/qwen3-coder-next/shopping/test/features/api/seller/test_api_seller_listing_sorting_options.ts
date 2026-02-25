import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_seller_listing_sorting_options(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection for testing
  const customerConnection: api.IConnection = { host: connection.host };
  // 1. Test sorting by created_at:asc (oldest first)
  {
    const result = await api.functional.shoppingMall.sellers.index(
      customerConnection,
      {
        body: {
          sort: "created_at:asc",
          limit: 10,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
    typia.assert(result);
    // Verify sorted by created_at ascending
    const timestamps = result.data.map((s) => new Date(s.created_at).getTime());
    TestValidator.predicate("created_at:asc order", () => {
      for (let i = 1; i < timestamps.length; i++) {
        if (timestamps[i] < timestamps[i - 1]) return false;
      }
      return true;
    });
  }
  // 2. Test sorting by created_at:desc (newest first)
  {
    const result = await api.functional.shoppingMall.sellers.index(
      customerConnection,
      {
        body: {
          sort: "created_at:desc",
          limit: 10,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
    typia.assert(result);
    // Verify sorted by created_at descending
    const timestamps = result.data.map((s) => new Date(s.created_at).getTime());
    TestValidator.predicate("created_at:desc order", () => {
      for (let i = 1; i < timestamps.length; i++) {
        if (timestamps[i] > timestamps[i - 1]) return false;
      }
      return true;
    });
  }
  // 3. Test sorting by shop_name:asc (alphabetical)
  {
    const result = await api.functional.shoppingMall.sellers.index(
      customerConnection,
      {
        body: {
          sort: "shop_name:asc",
          limit: 10,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
    typia.assert(result);
    // Verify sorted by shop_name ascending
    const shopNames = result.data.map((s) => s.shop_name);
    TestValidator.predicate("shop_name:asc order", () => {
      for (let i = 1; i < shopNames.length; i++) {
        if (shopNames[i] < shopNames[i - 1]) return false;
      }
      return true;
    });
  }
  // 4. Test sorting by shop_name:desc (reverse alphabetical)
  {
    const result = await api.functional.shoppingMall.sellers.index(
      customerConnection,
      {
        body: {
          sort: "shop_name:desc",
          limit: 10,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
    typia.assert(result);
    // Verify sorted by shop_name descending
    const shopNames = result.data.map((s) => s.shop_name);
    TestValidator.predicate("shop_name:desc order", () => {
      for (let i = 1; i < shopNames.length; i++) {
        if (shopNames[i] > shopNames[i - 1]) return false;
      }
      return true;
    });
  }
  // 5. Test sorting with status filtering
  {
    // Test filtering by approval_status with sorting
    const result = await api.functional.shoppingMall.sellers.index(
      customerConnection,
      {
        body: {
          approval_status: "approved",
          sort: "shop_name:asc",
          limit: 10,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
    typia.assert(result);
    // Verify all returned sellers are approved
    result.data.forEach((seller) => {
      TestValidator.equals(
        "approval_status is approved",
        seller.approval_status,
        "approved",
      );
    });
    // Verify sorted by shop_name ascending
    const shopNames = result.data.map((s) => s.shop_name);
    TestValidator.predicate("approved + shop_name:asc order", () => {
      for (let i = 1; i < shopNames.length; i++) {
        if (shopNames[i] < shopNames[i - 1]) return false;
      }
      return true;
    });
  }
  // 6. Test pagination with sorting
  {
    const limit = 2;
    const page1 = await api.functional.shoppingMall.sellers.index(
      customerConnection,
      {
        body: {
          sort: "shop_name:asc",
          page: 1,
          limit,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
    typia.assert(page1);
    const page2 = await api.functional.shoppingMall.sellers.index(
      customerConnection,
      {
        body: {
          sort: "shop_name:asc",
          page: 2,
          limit,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
    typia.assert(page2);
    // Verify pagination works correctly
    TestValidator.equals("page 1 has correct count", page1.data.length, limit);
    TestValidator.equals("page 2 has correct count", page2.data.length, limit);
    // Verify page 1 items are alphabetically before page 2 items
    const lastOnPage1 = page1.data[page1.data.length - 1].shop_name;
    const firstOnPage2 = page2.data[0].shop_name;
    TestValidator.predicate("pagination order", lastOnPage1 <= firstOnPage2);
  }
}
