import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_review_admin_search_with_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {});
  typia.assert(admin);
  // 2. Search reviews WITH deleted reviews included
  const responseWithDeleted = await api.functional.shoppingMall.reviews.index(
    adminConnection,
    {
      body: {
        includeDeleted: true,
        limit: 100,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(responseWithDeleted);
  // 3. Search reviews WITHOUT deleted reviews
  const responseWithoutDeleted =
    await api.functional.shoppingMall.reviews.index(adminConnection, {
      body: {
        includeDeleted: false,
        limit: 100,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(responseWithoutDeleted);
  // 4. Validate: With includeDeleted=true, count should be >= count without deleted
  TestValidator.predicate(
    "including deleted reviews returns at least as many results",
    responseWithDeleted.pagination.records >=
      responseWithoutDeleted.pagination.records,
  );
  // 5. Validate: All reviews without deleted should have null deleted_at
  const activeReviews = responseWithoutDeleted.data;
  const hasDeletedInActive = activeReviews.some(
    (review) => review.deleted_at !== null,
  );
  TestValidator.equals(
    "reviews without deleted flag have no deleted items",
    hasDeletedInActive,
    false,
  );
  // 6. Validate: Soft-deleted reviews have non-null deleted_at
  const deletedReviews = responseWithDeleted.data.filter(
    (review) => review.deleted_at !== null,
  );
  // If there are deleted reviews, verify they appear only in includeDeleted=true results
  if (deletedReviews.length > 0) {
    const deletedIds = new Set(deletedReviews.map((r) => r.id));
    const activeIds = new Set(activeReviews.map((r) => r.id));
    const deletedIdsInActive = [...deletedIds].filter((id) =>
      activeIds.has(id),
    );
    TestValidator.equals(
      "deleted reviews not present in non-deleted results",
      deletedIdsInActive.length,
      0,
    );
  }
  // 7. Test search functionality with a keyword
  if (responseWithDeleted.data.length > 0) {
    const sampleReview = responseWithDeleted.data[0];
    const searchContent = sampleReview.content;
    if (searchContent !== null) {
      // Extract a keyword from existing review content
      const keyword = RandomGenerator.substring(searchContent);
      const searchResponse = await api.functional.shoppingMall.reviews.index(
        adminConnection,
        {
          body: {
            search: keyword,
            includeDeleted: true,
            limit: 100,
          } satisfies IShoppingMallReview.IRequest,
        },
      );
      typia.assert(searchResponse);
      // Validate search results contain the keyword (case-insensitive)
      const matchingReviews = searchResponse.data.filter(
        (review) =>
          review.content !== null &&
          review.content.toLowerCase().includes(keyword.toLowerCase()),
      );
      TestValidator.predicate(
        "search results contain keyword matches",
        matchingReviews.length > 0,
      );
    }
  }
}
