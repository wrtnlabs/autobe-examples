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

export async function test_api_seller_listing_pagination_default(
  connection: api.IConnection,
): Promise<void> {
  // Create connection for seller listing
  const sellerConnection: api.IConnection = { host: connection.host };
  // Test default pagination (page=1, limit=10)
  const defaultPagination = await api.functional.shoppingMall.sellers.index(
    sellerConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(defaultPagination);
  // Validate pagination structure
  TestValidator.equals(
    "pagination current should be 1",
    defaultPagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 10",
    defaultPagination.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records should be >= 0",
    defaultPagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be >= 0",
    defaultPagination.pagination.pages >= 0,
  );
  // Validate data array structure
  TestValidator.predicate(
    "data should have expected number of records",
    defaultPagination.data.length <= 10,
  );
  // Validate seller summary structure for each record (if any exist)
  for (const seller of defaultPagination.data) {
    typia.assert<IShoppingMallSeller.ISummary>(seller);
    TestValidator.predicate(
      "seller has valid id format",
      /^[0-9a-f-]{36}$/i.test(seller.id),
    );
    TestValidator.predicate(
      "shop_name exists and is string",
      typeof seller.shop_name === "string" && seller.shop_name.length > 0,
    );
    TestValidator.predicate(
      "approval_status is valid",
      ["pending", "approved", "rejected"].includes(seller.approval_status),
    );
    TestValidator.predicate(
      "created_at is date-time format",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
        seller.created_at,
      ),
    );
  }
  // Test that second page returns different results (if available)
  if (defaultPagination.pagination.pages > 1) {
    const secondPage = await api.functional.shoppingMall.sellers.index(
      sellerConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
    typia.assert(secondPage);
    // Verify that first item of second page is not in first page
    const firstPageIds = defaultPagination.data.map(
      (s: IShoppingMallSeller.ISummary) => s.id,
    );
    const secondPageFirstId = secondPage.data[0].id;
    TestValidator.notEquals(
      "second page should have different items",
      firstPageIds.includes(secondPageFirstId),
      true,
    );
  }
}
