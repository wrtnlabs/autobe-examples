import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministrator";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_index_filtered_search(
  connection: api.IConnection,
): Promise<void> {
  // Administrator sign up and get authorized connection
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(
    adminJoinConnection,
    {
      body: {
        email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallAdministrator.IJoin,
    },
  );
  typia.assert(adminAuthorized);
  adminJoinConnection.headers = {
    Authorization: adminAuthorized.token.access,
  };
  // Prepare administrators for filter testing
  // Create sample administrator grades
  const regularGradeId = typia.random<string & tags.Format<"uuid">>();
  const superAdminGradeId = typia.random<string & tags.Format<"uuid">>();
  // Create a few admin summaries with varied attributes
  const admins: IShoppingMallAdministrator.ISummary[] = ArrayUtil.repeat(
    6,
    (i) => {
      return {
        id: typia.random<string & tags.Format<"uuid">>(),
        email: `email${i}@example.com`,
        name: `Name${i}`,
        isSuperAdmin: i % 2 === 0,
        createdAt: new Date().toISOString() as string &
          tags.Format<"date-time">,
        updatedAt: new Date().toISOString() as string &
          tags.Format<"date-time">,
        deletedAt: null,
        administratorGrade: {
          id: i < 3 ? regularGradeId : superAdminGradeId,
          name: i < 3 ? "Regular" : "Super",
          grade: i < 3 ? 1 : 10,
          superAdministrator: i < 3 ? false : true,
        },
      };
    },
  );
  // Test cases for filtering
  const filterTests: Array<{
    name: string;
    filter: IShoppingMallAdministrator.IRequest;
    predicate: (admin: IShoppingMallAdministrator.ISummary) => boolean;
  }> = [
    {
      name: "Filter by email",
      filter: { email: "email1@example.com", page: 1, limit: 10 },
      predicate: (admin) => admin.email === "email1@example.com",
    },
    {
      name: "Filter by name",
      filter: { name: "Name2", page: 1, limit: 10 },
      predicate: (admin) => admin.name === "Name2",
    },
    {
      name: "Filter by administrator grade id",
      filter: { administratorGradeId: superAdminGradeId, page: 1, limit: 10 },
      predicate: (admin) => admin.administratorGrade.id === superAdminGradeId,
    },
    {
      name: "Filter by super administrator status true",
      filter: { isSuperAdmin: true, page: 1, limit: 10 },
      predicate: (admin) => admin.isSuperAdmin === true,
    },
    {
      name: "Filter by super administrator status false",
      filter: { isSuperAdmin: false, page: 1, limit: 10 },
      predicate: (admin) => admin.isSuperAdmin === false,
    },
  ];
  // Run filter tests
  for (const testCase of filterTests) {
    const response: IPageIShoppingMallAdministrator.ISummary =
      await api.functional.shoppingMall.administrator.administrators.index(
        adminJoinConnection,
        { body: testCase.filter },
      );
    typia.assert(response);
    // Validate pagination info
    TestValidator.predicate(
      `${testCase.name} - pagination current page`,
      response.pagination.current === (testCase.filter.page ?? 1),
    );
    TestValidator.predicate(
      `${testCase.name} - pagination limit`,
      response.pagination.limit === (testCase.filter.limit ?? 10),
    );
    // Validate that all items match the filter predicate
    TestValidator.predicate(
      `${testCase.name} - all admins match filter`,
      response.data.every(testCase.predicate),
    );
    // Validate each admin conforms to ISummary
    for (const admin of response.data) {
      typia.assert(admin);
    }
  }
}
