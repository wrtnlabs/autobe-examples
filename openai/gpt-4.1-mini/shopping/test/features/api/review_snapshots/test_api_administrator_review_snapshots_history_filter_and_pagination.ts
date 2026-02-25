import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_review_snapshots_history_filter_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: "AdminPass1234",
    },
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Fetch unfiltered review snapshot history page 1
  const unfilteredResponse =
    await api.functional.shoppingMall.administrator.reviewSnapshots.history.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(unfilteredResponse);
  // 3. Validate basic pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    unfilteredResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    unfilteredResponse.pagination.limit === 10,
  );
  TestValidator.predicate(
    "total records is non-negative",
    unfilteredResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is correct",
    unfilteredResponse.pagination.pages >= 0,
  );
  if (unfilteredResponse.data.length === 0) {
    // No review snapshot data exists, skip further filtering tests
    return;
  }
  // Use first review snapshot as a filter base
  const baseSnapshot = unfilteredResponse.data[0];
  // 4. Filter by review snapshot ID
  const filterByIdResponse =
    await api.functional.shoppingMall.administrator.reviewSnapshots.history.index(
      adminConnection,
      {
        body: {
          id: baseSnapshot.id,
          page: 1,
          limit: 5,
        },
      },
    );
  typia.assert(filterByIdResponse);
  TestValidator.predicate(
    "filter by id returns at most one snapshot",
    filterByIdResponse.data.length <= 1,
  );
  for (const snapshot of filterByIdResponse.data) {
    TestValidator.equals(
      "snapshot.id matches filter id",
      snapshot.id,
      baseSnapshot.id,
    );
  }
  // 5. Filter by product review ID
  const productReviewId = baseSnapshot.review.id;
  const filterByReviewIdResponse =
    await api.functional.shoppingMall.administrator.reviewSnapshots.history.index(
      adminConnection,
      {
        body: {
          shoppingMallProductReviewId: productReviewId,
          page: 1,
          limit: 5,
        },
      },
    );
  typia.assert(filterByReviewIdResponse);
  for (const snapshot of filterByReviewIdResponse.data) {
    TestValidator.equals(
      "snapshot.review.id matches filter product review id",
      snapshot.review.id,
      productReviewId,
    );
  }
  // 6. Filter by rating range
  const minRating = 2;
  const maxRating = 4;
  const filterByRatingResponse =
    await api.functional.shoppingMall.administrator.reviewSnapshots.history.index(
      adminConnection,
      {
        body: {
          ratingMin: minRating,
          ratingMax: maxRating,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(filterByRatingResponse);
  for (const snapshot of filterByRatingResponse.data) {
    TestValidator.predicate(
      `snapshot.rating >= ${minRating}`,
      snapshot.rating >= minRating,
    );
    TestValidator.predicate(
      `snapshot.rating <= ${maxRating}`,
      snapshot.rating <= maxRating,
    );
  }
  // 7. Test pagination for page 2 with limit 3
  // If enough data exists
  if (unfilteredResponse.pagination.records > 3) {
    const page2Response =
      await api.functional.shoppingMall.administrator.reviewSnapshots.history.index(
        adminConnection,
        {
          body: {
            page: 2,
            limit: 3,
          },
        },
      );
    typia.assert(page2Response);
    TestValidator.predicate(
      "pagination page 2 data length <= limit 3",
      page2Response.data.length <= 3,
    );
  }
  // 8. Authorization test: manual unauthorized request
  // Prepare a connection without authorization header
  const unauthorizedConn: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized request is rejected", async () => {
    await api.functional.shoppingMall.administrator.reviewSnapshots.history.index(
      unauthorizedConn,
      {
        body: {
          page: 1,
          limit: 1,
        },
      },
    );
  });
}
