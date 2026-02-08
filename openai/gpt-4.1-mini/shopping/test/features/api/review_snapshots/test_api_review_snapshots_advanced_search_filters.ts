import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_review_snapshots_advanced_search_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // Query function
  async function querySnapshots(
    body: IShoppingMallReviewSnapshot.IRequest,
  ): Promise<IPageIShoppingMallReviewSnapshot.ISummary> {
    const response = await api.functional.shoppingMall.reviewSnapshots.index(
      adminConnection,
      { body },
    );
    typia.assert(response);
    return response;
  }
  const baseRequest: IShoppingMallReviewSnapshot.IRequest = {
    pagination: { current: 1, limit: 10 },
  } as any;
  // Test: default pagination
  let response = await querySnapshots(baseRequest);
  await TestValidator.predicate(
    "pagination current page is 1",
    response.pagination.current === 1,
  );
  await TestValidator.predicate(
    "pagination limit is 10",
    response.pagination.limit === 10,
  );
  await TestValidator.predicate(
    "pagination pages >= 0",
    response.pagination.pages >= 0,
  );
  await TestValidator.predicate(
    "pagination records >= 0",
    response.pagination.records >= 0,
  );
  await TestValidator.predicate(
    "data array present",
    Array.isArray(response.data),
  );
  for (const snapshot of response.data) {
    typia.assert(snapshot);
    // ISummary is empty object type, so no property access allowed
    await TestValidator.predicate(
      "snapshot is object",
      typeof snapshot === "object" && snapshot !== null,
    );
  }
  // Test: filter by min_rating and max_rating (just send filters, no response property test)
  response = await querySnapshots({
    min_rating: 3,
    max_rating: 5,
    pagination: { current: 1, limit: 5 },
  });
  await TestValidator.predicate(
    "data array present with rating filter",
    Array.isArray(response.data),
  );
  // Test: filter by created_after and created_before (no property access in response)
  const nowISO = new Date().toISOString();
  response = await querySnapshots({
    created_after: new Date(
      Date.now() - 90 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    created_before: nowISO,
    pagination: { current: 1, limit: 5 },
  });
  await TestValidator.predicate(
    "data array present with created after/before filter",
    Array.isArray(response.data),
  );
  // Test: filter by deleted_after and deleted_before
  response = await querySnapshots({
    deleted_after: new Date(
      Date.now() - 365 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    deleted_before: nowISO,
    pagination: { current: 1, limit: 5 },
  });
  await TestValidator.predicate(
    "data array present with deleted after/before filter",
    Array.isArray(response.data),
  );
  // Test: combined filters min_rating, max_rating, created_after, created_before
  response = await querySnapshots({
    min_rating: 4,
    max_rating: 5,
    created_after: new Date(
      Date.now() - 180 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    created_before: nowISO,
    pagination: { current: 1, limit: 10 },
  });
  await TestValidator.predicate(
    "data array present with combined filters",
    Array.isArray(response.data),
  );
  // Test: filter with body_search, removed since response ISummary does not have body
  // But to follow scenario, we send the filter and test response shape
  response = await querySnapshots({
    body_search: "no such substring to match definitely",
    pagination: { current: 1, limit: 5 },
  });
  await TestValidator.predicate(
    "empty data array for no matches or data array present",
    Array.isArray(response.data),
  );
  // Test: pagination page 2
  response = await querySnapshots({ pagination: { current: 2, limit: 2 } });
  await TestValidator.predicate(
    "pagination current page is 2",
    response.pagination.current === 2,
  );
  await TestValidator.predicate(
    "pagination limit is 2",
    response.pagination.limit === 2,
  );
  await TestValidator.predicate(
    "pagination pages >= 0",
    response.pagination.pages >= 0,
  );
  await TestValidator.predicate(
    "pagination records >= 0",
    response.pagination.records >= 0,
  );
  for (const snapshot of response.data) {
    typia.assert(snapshot);
    await TestValidator.predicate(
      "snapshot is object",
      typeof snapshot === "object" && snapshot !== null,
    );
  }
}
