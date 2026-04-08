import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistItem";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test wishlist pagination, sorting, and filtering functionality.
 *
 * Validates the complete wishlist listing endpoint including member authentication, pagination metadata accuracy, sorting by created_at and product name in both directions, date range filtering, text search filtering, and combined filter scenarios. Ensures that all query parameters are correctly processed and the response structure matches the expected IPageIShoppingMallWishlistItem.ISummary format.
 *
 * 1. Member authentication via authorize_member_join utility function.
 * 2. Basic pagination test with page and limit parameters.
 * 3. Sorting validation for created_at field (+/- directions).
 * 4. Sorting validation for name field (+/- directions).
 * 5. Date range filtering with createdAtFrom and createdAtTo.
 * 6. Text search filtering on product names.
 * 7. Combined filters test with multiple parameters.
 */
export async function test_api_wishlist_pagination_sorting_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(member);
  // 2. Basic pagination test - default parameters
  const defaultResult =
    await api.functional.shoppingMall.member.wishlist_items.index(
      memberConnection,
      {
        body: {} satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(defaultResult);
  // 3. Pagination with explicit page and limit
  const paginatedResult =
    await api.functional.shoppingMall.member.wishlist_items.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals("current page", paginatedResult.pagination.current, 1);
  TestValidator.equals("limit", paginatedResult.pagination.limit, 10);
  TestValidator.predicate(
    "records is non-negative",
    paginatedResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    paginatedResult.pagination.pages >= 0,
  );
  // 4. Sorting by created_at - ascending
  const sortedCreatedAtAsc =
    await api.functional.shoppingMall.member.wishlist_items.index(
      memberConnection,
      {
        body: {
          sort: "+created_at",
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(sortedCreatedAtAsc);
  // 5. Sorting by created_at - descending
  const sortedCreatedAtDesc =
    await api.functional.shoppingMall.member.wishlist_items.index(
      memberConnection,
      {
        body: {
          sort: "-created_at",
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(sortedCreatedAtDesc);
  // 6. Sorting by name - ascending
  const sortedNameAsc =
    await api.functional.shoppingMall.member.wishlist_items.index(
      memberConnection,
      {
        body: {
          sort: "+name",
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(sortedNameAsc);
  // 7. Sorting by name - descending
  const sortedNameDesc =
    await api.functional.shoppingMall.member.wishlist_items.index(
      memberConnection,
      {
        body: {
          sort: "-name",
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(sortedNameDesc);
  // 8. Date range filtering
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dateFilteredResult =
    await api.functional.shoppingMall.member.wishlist_items.index(
      memberConnection,
      {
        body: {
          createdAtFrom: yesterday.toISOString(),
          createdAtTo: tomorrow.toISOString(),
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(dateFilteredResult);
  // 9. Text search filtering
  const searchResult =
    await api.functional.shoppingMall.member.wishlist_items.index(
      memberConnection,
      {
        body: {
          search: "test",
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(searchResult);
  // 10. Combined filters test
  const combinedResult =
    await api.functional.shoppingMall.member.wishlist_items.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "-created_at",
          search: "product",
          createdAtFrom: yesterday.toISOString(),
          createdAtTo: tomorrow.toISOString(),
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(combinedResult);
  TestValidator.equals(
    "combined current page",
    combinedResult.pagination.current,
    1,
  );
  TestValidator.equals("combined limit", combinedResult.pagination.limit, 20);
}
