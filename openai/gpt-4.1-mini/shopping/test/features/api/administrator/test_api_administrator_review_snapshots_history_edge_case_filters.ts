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

export async function test_api_administrator_review_snapshots_history_edge_case_filters(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: This test evaluates edge cases for the PATCH /shoppingMall/administrator/reviewSnapshots/history endpoint.
  // It covers authorization, filtering by date ranges (snapshotCreatedFrom/To, createdFrom/To), text search in body,
  // pagination boundaries (page 1, limit 1, limit 100), invalid filters, empty result sets, and audit log confirmation.
  // Step 1: Administrator join and authorized connection setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {});
  typia.assert(adminAuth);
  // authorize_administrator_join internally updates adminConnection.headers, so no manual assignment needed
  // For realistic testing, we assume some review snapshots exist in the system, generated separately.
  // Declare a helper function to call the reviewSnapshots.history.index endpoint
  async function getReviewSnapshots(
    body: IShoppingMallReviewSnapshot.IRequest,
  ): Promise<IPageIShoppingMallReviewSnapshot.ISummary> {
    const response =
      await api.functional.shoppingMall.administrator.reviewSnapshots.history.index(
        adminConnection,
        { body },
      );
    typia.assert(response);
    return response;
  }
  // Step 2: Test valid filter combinations - filtering by creation date ranges of snapshot
  {
    const now = new Date();
    const aWeekAgo = new Date(
      now.getTime() - 7 * 24 * 3600 * 1000,
    ).toISOString();
    const yesterday = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
    const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();
    // Filter with snapshotCreatedFrom and snapshotCreatedTo
    let result = await getReviewSnapshots({
      snapshotCreatedFrom: aWeekAgo,
      snapshotCreatedTo: tomorrow,
      page: 1,
      limit: 10,
    });
    typia.assert(result);
    // Filter with createdFrom and createdTo
    result = await getReviewSnapshots({
      createdFrom: aWeekAgo,
      createdTo: tomorrow,
      page: 1,
      limit: 10,
    });
    typia.assert(result);
  }
  // Step 3: Test partial text search in review body
  {
    // We use a sample string to test partial body match
    const searchText = "good";
    const result = await getReviewSnapshots({
      body: searchText,
      page: 1,
      limit: 10,
    });
    typia.assert(result);
    // Validate that all returned review snapshots contain the searchText in the body, if body is non-null
    for (const snapshot of result.data) {
      if (snapshot.body) {
        TestValidator.predicate(
          `body includes '${searchText}'`,
          snapshot.body.includes(searchText),
        );
      }
    }
  }
  // Step 4: Test invalid filter parameter combinations - snapshotCreatedFrom after snapshotCreatedTo
  {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
    const aWeekAgo = new Date(
      now.getTime() - 7 * 24 * 3600 * 1000,
    ).toISOString();
    await TestValidator.error(
      "invalid snapshotCreatedFrom > snapshotCreatedTo",
      async () => {
        await getReviewSnapshots({
          snapshotCreatedFrom: yesterday,
          snapshotCreatedTo: aWeekAgo,
          page: 1,
          limit: 10,
        });
      },
    );
    await TestValidator.error("invalid createdFrom > createdTo", async () => {
      await getReviewSnapshots({
        createdFrom: yesterday,
        createdTo: aWeekAgo,
        page: 1,
        limit: 10,
      });
    });
  }
  // Step 5: Test pagination limits - page 1 with limit 1 and limit 100
  {
    const resultLimit1 = await getReviewSnapshots({ page: 1, limit: 1 });
    typia.assert(resultLimit1);
    TestValidator.predicate(
      "at most 1 record for limit 1",
      resultLimit1.data.length <= 1,
    );
    const resultLimit100 = await getReviewSnapshots({ page: 1, limit: 100 });
    typia.assert(resultLimit100);
    TestValidator.predicate(
      "at most 100 records for limit 100",
      resultLimit100.data.length <= 100,
    );
  }
  // Step 6: Test empty result when filters match none
  {
    const result = await getReviewSnapshots({
      body: "this text does not exist in any review snapshot body",
      page: 1,
      limit: 10,
    });
    typia.assert(result);
    TestValidator.equals(
      "empty data array on unmatched filter",
      result.data,
      [],
    );
    TestValidator.equals(
      "total records count zero",
      result.pagination.records,
      0,
    );
  }
  // Step 7: Test unauthorized access
  {
    const unauthorizedConnection: api.IConnection = { host: connection.host };
    await TestValidator.httpError(
      "unauthorized access forbidden",
      401,
      async () => {
        await api.functional.shoppingMall.administrator.reviewSnapshots.history.index(
          unauthorizedConnection,
          { body: { page: 1, limit: 10 } },
        );
      },
    );
  }
  // Note: Audit log confirmation cannot be tested here as it requires external log access.
}
