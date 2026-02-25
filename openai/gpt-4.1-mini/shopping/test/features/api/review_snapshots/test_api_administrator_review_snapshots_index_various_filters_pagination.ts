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
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_product_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_product_reviews_create";
import { generate_random_shopping_mall_seller_sales_create } from "../../../generate/generate_random_shopping_mall_seller_sales_create";
import { prepare_random_shopping_mall_sale } from "../../../prepare/prepare_random_shopping_mall_sale";
import { prepare_random_shopping_mall_sale_review } from "../../../prepare/prepare_random_shopping_mall_sale_review";

export async function test_api_administrator_review_snapshots_index_various_filters_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Admin authentication and retrieving unfiltered paginated review snapshots list
  const adminConnection: api.IConnection = { host: connection.host };
  const password = "Password123!";
  const adminJoinInfo = await authorize_administrator_join(adminConnection, {
    body: { password },
  });
  typia.assert(adminJoinInfo);
  const adminLoginInfo = await authorize_administrator_login(adminConnection, {
    body: {
      email: adminJoinInfo.email,
      password: password,
    },
  });
  typia.assert(adminLoginInfo);
  adminConnection.headers = {
    Authorization: `Bearer ${adminLoginInfo.token.access}`,
  };
  // Scenario 1: retrieve all review snapshots without filters
  const pageAll =
    await api.functional.shoppingMall.administrator.reviewSnapshots.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(pageAll);
  TestValidator.predicate(
    "pagination current page >= 1",
    pageAll.pagination.current >= 1,
  );
  TestValidator.predicate(
    "total records count >= 0",
    pageAll.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages count >= 0",
    pageAll.pagination.pages >= 0,
  );
  TestValidator.predicate("limit per page >= 0", pageAll.pagination.limit >= 0);
  for (const snapshot of pageAll.data) {
    typia.assert(snapshot);
    TestValidator.predicate(
      "snapshot rating between 1 and 5 inclusive",
      snapshot.rating >= 1 && snapshot.rating <= 5,
    );
    TestValidator.predicate(
      "snapshot body is string or null",
      snapshot.body === null || typeof snapshot.body === "string",
    );
    TestValidator.predicate(
      "timestamps snapshotCreatedAt is valid ISO datetime string",
      typeof snapshot.snapshotCreatedAt === "string" &&
        !Number.isNaN(Date.parse(snapshot.snapshotCreatedAt)),
    );
  }
  // Scenario 2: Filtered list of review snapshots by rating range and snapshot creation date
  const ratingMin: number = 3;
  const ratingMax: number = 5;
  const now = new Date();
  const snapshotCreatedFrom = new Date(
    now.getTime() - 60 * 1000 * 60 * 24 * 7,
  ).toISOString(); // 7 days ago
  const snapshotCreatedTo = now.toISOString();
  const pageFiltered =
    await api.functional.shoppingMall.administrator.reviewSnapshots.index(
      adminConnection,
      {
        body: {
          ratingMin,
          ratingMax,
          snapshotCreatedFrom,
          snapshotCreatedTo,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(pageFiltered);
  TestValidator.predicate(
    "filtered pagination current page >= 1",
    pageFiltered.pagination.current >= 1,
  );
  TestValidator.predicate(
    "filtered pagination records >= 0",
    pageFiltered.pagination.records >= 0,
  );
  TestValidator.predicate(
    "filtered pagination pages >= 0",
    pageFiltered.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "filtered pagination limit >= 0 and <= 100",
    pageFiltered.pagination.limit >= 0 && pageFiltered.pagination.limit <= 100,
  );
  for (const snapshot of pageFiltered.data) {
    typia.assert(snapshot);
    TestValidator.predicate(
      "filtered snapshot rating within bounds",
      snapshot.rating >= ratingMin && snapshot.rating <= ratingMax,
    );
    const createdAt = Date.parse(snapshot.snapshotCreatedAt);
    const from = Date.parse(snapshotCreatedFrom);
    const to = Date.parse(snapshotCreatedTo);
    TestValidator.predicate(
      "filtered snapshot createdAt within filter bounds",
      createdAt >= from && createdAt <= to,
    );
  }
  // Scenario 3: Unauthorized access attempt
  const noAuthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access for review snapshots",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.reviewSnapshots.index(
        noAuthConnection,
        {
          body: {},
        },
      );
    },
  );
}
