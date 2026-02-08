import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSystemVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystemVersion";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSystemVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemVersion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_system_version_list_filter_pagination(
  connection: api.IConnection,
): Promise<void> {
  // The scenario tests the system version audit log retrieval with filtering, pagination, authorization, and edge cases.
  // 1. Authenticate as administrator and get authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: IShoppingMallAdministrator.IJoin = {};
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Test by calling PATCH /shoppingMall/systemVersions with various filters
  // Base request body template
  const baseRequest: IShoppingMallSystemVersion.IRequest = {};
  // --- Test: No filters, default pagination
  const noFilterResponse =
    await api.functional.shoppingMall.systemVersions.index(adminConnection, {
      body: baseRequest,
    });
  typia.assert(noFilterResponse);
  // Validate pagination metadata and response data
  TestValidator.predicate(
    "pagination current positive",
    noFilterResponse.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit non-negative",
    noFilterResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    noFilterResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    noFilterResponse.pagination.pages >= 0,
  );
  TestValidator.equals(
    "pages calculation",
    noFilterResponse.pagination.pages,
    Math.ceil(
      noFilterResponse.pagination.records /
        (noFilterResponse.pagination.limit || 1),
    ),
  );
  // --- Test: Filtering by entityName
  // Using a realistic entityName substring to filter
  const entityNameFilter = { entityName: RandomGenerator.alphabets(5) };
  const entityNameRequest: IShoppingMallSystemVersion.IRequest = {
    ...entityNameFilter,
  };
  const entityNameResponse =
    await api.functional.shoppingMall.systemVersions.index(adminConnection, {
      body: entityNameRequest,
    });
  typia.assert(entityNameResponse);
  // --- Test: Filtering by entityId (UUID format)
  const entityIdFilter = {
    entityId: typia.random<string & tags.Format<"uuid">>(),
  };
  const entityIdRequest: IShoppingMallSystemVersion.IRequest = {
    ...entityIdFilter,
  };
  const entityIdResponse =
    await api.functional.shoppingMall.systemVersions.index(adminConnection, {
      body: entityIdRequest,
    });
  typia.assert(entityIdResponse);
  // --- Test: Filtering by versionNumber (number, assuming positive integer)
  const versionNumberFilter = {
    versionNumber: Math.floor(Math.random() * 100) + 1,
  };
  const versionNumberRequest: IShoppingMallSystemVersion.IRequest = {
    ...versionNumberFilter,
  };
  const versionNumberResponse =
    await api.functional.shoppingMall.systemVersions.index(adminConnection, {
      body: versionNumberRequest,
    });
  typia.assert(versionNumberResponse);
  // --- Test: Filtering by changedFields (string, substring search)
  const changedFieldsFilter = { changedFields: RandomGenerator.alphabets(5) };
  const changedFieldsRequest: IShoppingMallSystemVersion.IRequest = {
    ...changedFieldsFilter,
  };
  const changedFieldsResponse =
    await api.functional.shoppingMall.systemVersions.index(adminConnection, {
      body: changedFieldsRequest,
    });
  typia.assert(changedFieldsResponse);
  // --- Test: Filtering by changeDescription (string, substring search)
  const changeDescriptionFilter = {
    changeDescription: RandomGenerator.paragraph({ sentences: 1 }),
  };
  const changeDescriptionRequest: IShoppingMallSystemVersion.IRequest = {
    ...changeDescriptionFilter,
  };
  const changeDescriptionResponse =
    await api.functional.shoppingMall.systemVersions.index(adminConnection, {
      body: changeDescriptionRequest,
    });
  typia.assert(changeDescriptionResponse);
  // --- Test: Filtering by changedBy (string, username or identifier)
  const changedByFilter = { changedBy: RandomGenerator.alphabets(7) };
  const changedByRequest: IShoppingMallSystemVersion.IRequest = {
    ...changedByFilter,
  };
  const changedByResponse =
    await api.functional.shoppingMall.systemVersions.index(adminConnection, {
      body: changedByRequest,
    });
  typia.assert(changedByResponse);
  // --- Test: Filtering by createdAt range (date-time string ISO 8601)
  // Using reasonable date ranges
  const now = new Date();
  const dateFrom = new Date(
    now.getTime() - 1000 * 60 * 60 * 24 * 30,
  ).toISOString(); // 30 days ago
  const dateTo = now.toISOString();
  const createdAtFilter = { createdAtFrom: dateFrom, createdAtTo: dateTo };
  const createdAtRequest: IShoppingMallSystemVersion.IRequest = {
    ...createdAtFilter,
  };
  const createdAtResponse =
    await api.functional.shoppingMall.systemVersions.index(adminConnection, {
      body: createdAtRequest,
    });
  typia.assert(createdAtResponse);
  // --- Test: Pagination parameters - page, limit
  // Request page 2, limit 5
  const paginationFilter = { page: 2, limit: 5 };
  const paginationRequest: IShoppingMallSystemVersion.IRequest = {
    ...paginationFilter,
  };
  const paginationResponse =
    await api.functional.shoppingMall.systemVersions.index(adminConnection, {
      body: paginationRequest,
    });
  typia.assert(paginationResponse);
  TestValidator.equals(
    "pagination current page 2",
    paginationResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit 5",
    paginationResponse.pagination.limit,
    5,
  );
  // --- Test: Combination of filters that likely yields no results
  const noResultFilter: IShoppingMallSystemVersion.IRequest = {
    entityName: "nonexistent_entity_name_xyz123",
    entityId: "00000000-0000-0000-0000-000000000000",
    versionNumber: 999999,
    changedFields: "impossible_field_abc",
    changeDescription: "no matching records",
    changedBy: "no_such_user_xyz",
    createdAtFrom: "1900-01-01T00:00:00.000Z",
    createdAtTo: "1900-01-01T00:00:01.000Z",
    page: 1,
    limit: 5,
  };
  const noResultResponse =
    await api.functional.shoppingMall.systemVersions.index(adminConnection, {
      body: noResultFilter,
    });
  typia.assert(noResultResponse);
  TestValidator.equals("empty data length", noResultResponse.data.length, 0);
  TestValidator.equals(
    "empty records count",
    noResultResponse.pagination.records,
    0,
  );
  // --- Test: Unauthorized access - use base connection without authorization
  await TestValidator.httpError("unauthorized access", 401, async () => {
    await api.functional.shoppingMall.systemVersions.index(connection, {
      body: baseRequest,
    });
  });
}
