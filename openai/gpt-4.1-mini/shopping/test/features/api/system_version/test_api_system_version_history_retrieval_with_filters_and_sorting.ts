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

export async function test_api_system_version_history_retrieval_with_filters_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test retrieval of system version history records with admin auth
  // 1. Admin joins and obtains authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Use authorize_administrator_join utility to create admin account and get token
  await authorize_administrator_join(adminConnection, {});
  // Helper to call the PATCH /shoppingMall/administrator/systemVersions/history endpoint
  async function getVersionHistory(body: IShoppingMallSystemVersion.IRequest) {
    const response =
      await api.functional.shoppingMall.administrator.systemVersions.history.index(
        adminConnection,
        { body },
      );
    typia.assert(response);
    return response;
  }
  // 2. Test unauthorized access fails
  const unauthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access rejected",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.systemVersions.history.index(
        unauthConnection,
        { body: {} },
      );
    },
  );
  // 3. Test pagination with valid page and pageSize
  {
    // Minimum pagination parameters
    const minPageReq: IShoppingMallSystemVersion.IRequest = {
      page: 1,
      pageSize: 1,
      limit: 1,
    };
    const minPageRes = await getVersionHistory(minPageReq);
    // Check pagination metadata
    TestValidator.predicate(
      "pagination minimum page is at least 1",
      minPageRes.pagination.current >= 1,
    );
    TestValidator.equals(
      "pagination minimum page size",
      minPageRes.pagination.limit,
      1,
    );
    TestValidator.predicate(
      "pagination records count non-negative",
      minPageRes.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages count non-negative",
      minPageRes.pagination.pages >= 0,
    );
    // Maximum pageSize allowed
    const maxPageReq: IShoppingMallSystemVersion.IRequest = {
      page: 1,
      pageSize: 100,
      limit: 100,
    };
    const maxPageRes = await getVersionHistory(maxPageReq);
    TestValidator.predicate(
      "pagination maximum page size at most 100",
      maxPageRes.pagination.limit <= 100,
    );
  }
  // 4. Test filtering: versionNumber, entityName, createdAtStart, createdAtEnd
  {
    // For filtering tests, first get any available data to know valid values
    const anyData = await getVersionHistory({ page: 1, pageSize: 5, limit: 5 });
    const candidates = anyData.data;
    if (candidates.length > 0) {
      // pick one candidate
      const sample = candidates[0];
      // Filter by versionNumber
      const filterByVersion: IShoppingMallSystemVersion.IRequest = {
        versionNumber: sample.versionNumber,
        page: 1,
        pageSize: 10,
        limit: 10,
      };
      const filteredVersion = await getVersionHistory(filterByVersion);
      for (const item of filteredVersion.data) {
        TestValidator.equals(
          "filter by versionNumber",
          item.versionNumber,
          sample.versionNumber,
        );
      }
      // Filter by entityName
      const filterByEntity: IShoppingMallSystemVersion.IRequest = {
        entityName: sample.entityName,
        page: 1,
        pageSize: 10,
        limit: 10,
      };
      const filteredEntity = await getVersionHistory(filterByEntity);
      for (const item of filteredEntity.data) {
        TestValidator.equals(
          "filter by entityName",
          item.entityName,
          sample.entityName,
        );
      }
      // Filter by createdAtStart (should get versions created after sample.createdAt)
      const filterByCreatedAtStart: IShoppingMallSystemVersion.IRequest = {
        createdAtStart: sample.createdAt,
        page: 1,
        pageSize: 10,
        limit: 10,
      };
      const filteredCreatedAtStart = await getVersionHistory(
        filterByCreatedAtStart,
      );
      for (const item of filteredCreatedAtStart.data) {
        TestValidator.predicate(
          "filter by createdAtStart",
          item.createdAt >= sample.createdAt,
        );
      }
      // Filter by createdAtEnd (should get versions created before or equal to sample.createdAt)
      const filterByCreatedAtEnd: IShoppingMallSystemVersion.IRequest = {
        createdAtEnd: sample.createdAt,
        page: 1,
        pageSize: 10,
        limit: 10,
      };
      const filteredCreatedAtEnd =
        await getVersionHistory(filterByCreatedAtEnd);
      for (const item of filteredCreatedAtEnd.data) {
        TestValidator.predicate(
          "filter by createdAtEnd",
          item.createdAt <= sample.createdAt,
        );
      }
    }
  }
  // 5. Test sorting by versionNumber and createdAt ascending and descending
  {
    // Sorting by versionNumber ascending
    const sortVersionAscReq: IShoppingMallSystemVersion.IRequest = {
      sortField: "versionNumber",
      sortOrder: "asc",
      page: 1,
      pageSize: 10,
      limit: 10,
    };
    const sortedVersionAsc = await getVersionHistory(sortVersionAscReq);
    for (let i = 1; i < sortedVersionAsc.data.length; i++) {
      TestValidator.predicate(
        "versionNumber ascending sorted",
        sortedVersionAsc.data[i - 1].versionNumber <=
          sortedVersionAsc.data[i].versionNumber,
      );
    }
    // Sorting by versionNumber descending
    const sortVersionDescReq: IShoppingMallSystemVersion.IRequest = {
      sortField: "versionNumber",
      sortOrder: "desc",
      page: 1,
      pageSize: 10,
      limit: 10,
    };
    const sortedVersionDesc = await getVersionHistory(sortVersionDescReq);
    for (let i = 1; i < sortedVersionDesc.data.length; i++) {
      TestValidator.predicate(
        "versionNumber descending sorted",
        sortedVersionDesc.data[i - 1].versionNumber >=
          sortedVersionDesc.data[i].versionNumber,
      );
    }
    // Sorting by createdAt ascending
    const sortCreatedAtAscReq: IShoppingMallSystemVersion.IRequest = {
      sortField: "createdAt",
      sortOrder: "asc",
      page: 1,
      pageSize: 10,
      limit: 10,
    };
    const sortedCreatedAtAsc = await getVersionHistory(sortCreatedAtAscReq);
    for (let i = 1; i < sortedCreatedAtAsc.data.length; i++) {
      TestValidator.predicate(
        "createdAt ascending sorted",
        sortedCreatedAtAsc.data[i - 1].createdAt <=
          sortedCreatedAtAsc.data[i].createdAt,
      );
    }
    // Sorting by createdAt descending
    const sortCreatedAtDescReq: IShoppingMallSystemVersion.IRequest = {
      sortField: "createdAt",
      sortOrder: "desc",
      page: 1,
      pageSize: 10,
      limit: 10,
    };
    const sortedCreatedAtDesc = await getVersionHistory(sortCreatedAtDescReq);
    for (let i = 1; i < sortedCreatedAtDesc.data.length; i++) {
      TestValidator.predicate(
        "createdAt descending sorted",
        sortedCreatedAtDesc.data[i - 1].createdAt >=
          sortedCreatedAtDesc.data[i].createdAt,
      );
    }
  }
}
