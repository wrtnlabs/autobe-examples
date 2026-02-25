import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSystemVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystemVersion";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallSystemVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemVersion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_system_version_listing_success_with_filters_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "secureP@ssw0rd",
    },
  });
  typia.assert(adminAuth);
  // Use the authenticated connection for subsequent calls
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Call system version listing with no filters (default pagination)
  const emptyFilterResponse =
    await api.functional.shoppingMall.administrator.systemVersions.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(emptyFilterResponse);
  // Pagination checks
  TestValidator.predicate(
    "pagination current page > 0",
    emptyFilterResponse.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    emptyFilterResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    emptyFilterResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    emptyFilterResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data is an array",
    Array.isArray(emptyFilterResponse.data),
  );
  // 3. If data exists, verify each record structure
  for (const record of emptyFilterResponse.data) {
    typia.assert(record);
    TestValidator.predicate(
      "record versionNumber > 0",
      record.versionNumber > 0,
    );
    TestValidator.predicate(
      "record createdAt valid ISO date",
      !isNaN(Date.parse(record.createdAt)),
    );
    TestValidator.predicate(
      "record entityName is string",
      typeof record.entityName === "string",
    );
  }
  // 4. Test filters
  // We create valid filter props from an existing record to ensure filter results
  if (emptyFilterResponse.data.length > 0) {
    const sampleRecord = emptyFilterResponse.data[0];
    // Prepare valid filters
    const filterBody: IShoppingMallSystemVersion.IRequest = {
      versionNumber: sampleRecord.versionNumber,
      createdAtStart: sampleRecord.createdAt,
      createdAtEnd: sampleRecord.createdAt,
      entityName: sampleRecord.entityName,
    };
    const filteredResponse =
      await api.functional.shoppingMall.administrator.systemVersions.index(
        adminConnection,
        {
          body: filterBody,
        },
      );
    typia.assert(filteredResponse);
    // Validate filtered records
    for (const record of filteredResponse.data) {
      if (filterBody.versionNumber !== undefined) {
        TestValidator.equals(
          "filter by versionNumber matches",
          record.versionNumber,
          filterBody.versionNumber,
        );
      }
      if (filterBody.entityName !== undefined) {
        TestValidator.equals(
          "filter by entityName matches",
          record.entityName,
          filterBody.entityName,
        );
      }
      if (filterBody.createdAtStart !== undefined) {
        TestValidator.predicate(
          "filter by createdAtStart after or equal",
          new Date(record.createdAt) >= new Date(filterBody.createdAtStart),
        );
      }
      if (filterBody.createdAtEnd !== undefined) {
        TestValidator.predicate(
          "filter by createdAtEnd before or equal",
          new Date(record.createdAt) <= new Date(filterBody.createdAtEnd),
        );
      }
    }
    // 5. Test sorting and pagination
    const sortAndPaginateBody: IShoppingMallSystemVersion.IRequest = {
      page: 1,
      pageSize: 5,
      sortField: "versionNumber",
      sortOrder: "desc",
    };
    const paginatedResponse =
      await api.functional.shoppingMall.administrator.systemVersions.index(
        adminConnection,
        {
          body: sortAndPaginateBody,
        },
      );
    typia.assert(paginatedResponse);
    // Pagination checks
    TestValidator.equals(
      "pagination current page equals requested",
      paginatedResponse.pagination.current,
      sortAndPaginateBody.page!,
    );
    TestValidator.equals(
      "pagination limit equals requested pageSize",
      paginatedResponse.pagination.limit,
      sortAndPaginateBody.pageSize!,
    );
    // Sorted check (descending by versionNumber)
    for (let i = 1; i < paginatedResponse.data.length; i++) {
      TestValidator.predicate(
        "sorted descending by versionNumber",
        paginatedResponse.data[i - 1].versionNumber >=
          paginatedResponse.data[i].versionNumber,
      );
    }
  }
  // 6. Test unauthorized access denied
  const unauthConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized access throws error", async () => {
    await api.functional.shoppingMall.administrator.systemVersions.index(
      unauthConnection,
      {
        body: {},
      },
    );
  });
}
