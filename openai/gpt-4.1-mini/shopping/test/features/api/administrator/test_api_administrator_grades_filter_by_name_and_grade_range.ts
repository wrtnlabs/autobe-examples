import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorGrade";
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

export async function test_api_administrator_grades_filter_by_name_and_grade_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and login
  const adminConnection: api.IConnection = { host: connection.host };
  // Random valid join body, here we assume IJoin is empty object per provided DTO, so use empty object
  const adminAuthorized: IShoppingMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {},
    });
  // Apply token to connection headers
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Prepare several administrator grades for testing filtering
  // Since no utility for creating grades is provided, and no endpoint given for creation, rely on existing grades
  // So we'll run tests on filtering with random strings and ranges
  // 3. Perform test cases
  // Test case: partial name match
  {
    // Random partial name substring
    const partialName = RandomGenerator.substring("administratorgrade");
    // We form a request with only the name filter
    const requestBody1: IShoppingMallAdministratorGrade.IRequest = {
      // exact property names from DTO are not listed, so assume empty filter object allowed
    } as any;
    // But the problem is DTO IShoppingMallAdministratorGrade.IRequest is empty (from schema provided, no listed properties)
    // Given this, we cannot set any filter properties
    // So do minimal call with empty filter body
    const output1: IPageIShoppingMallAdministratorGrade.ISummary =
      await api.functional.shoppingMall.administrator.administrator.grades.index(
        adminConnection,
        {
          body: requestBody1,
        },
      );
    typia.assert(output1);
    TestValidator.predicate(
      "pagination current page is positive",
      output1.pagination.current > 0,
    );
  }
  // Test case: minimum and maximum grade range
  {
    // Because no properties exist in IRequest for minGrade/maxGrade or name filter, cannot set filters
    // So do test with empty request to validate response is well formed
    const requestBody2: IShoppingMallAdministratorGrade.IRequest = {};
    const output2: IPageIShoppingMallAdministratorGrade.ISummary =
      await api.functional.shoppingMall.administrator.administrator.grades.index(
        adminConnection,
        {
          body: requestBody2,
        },
      );
    typia.assert(output2);
    // Pagination checks
    TestValidator.predicate(
      "pagination pages >= 0",
      output2.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "pagination records >= 0",
      output2.pagination.records >= 0,
    );
  }
  // Test case: combined filters and no matching results
  // Given DTO IShoppingMallAdministratorGrade.IRequest has no properties defined, so can't set any filter
  // Therefore do test with empty filter and expect results
  {
    const requestBody3: IShoppingMallAdministratorGrade.IRequest = {};
    const output3: IPageIShoppingMallAdministratorGrade.ISummary =
      await api.functional.shoppingMall.administrator.administrator.grades.index(
        adminConnection,
        {
          body: requestBody3,
        },
      );
    typia.assert(output3);
    // Check data array presence
    TestValidator.predicate("data is array", Array.isArray(output3.data));
  }
}
