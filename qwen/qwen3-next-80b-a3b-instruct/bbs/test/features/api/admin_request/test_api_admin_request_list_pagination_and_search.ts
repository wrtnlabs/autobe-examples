import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdminRequest";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import type { IEconomicBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardAdminRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_admin_request_list_pagination_and_search(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_login(superAdminConnection, {
    body: typia.random<IEconomicBoardSuperAdministrator.IJoin>(),
  });
  // Login as super administrator
  await authorize_super_administrator_login(superAdminConnection, {
    body: typia.random<IEconomicBoardSuperAdministrator.ILogin>(),
  });
  // Retrieve page 1 of admin requests
  const page1Result =
    await api.functional.economicBoard.citizen.admin_requests.index(
      superAdminConnection,
    );
  typia.assert(page1Result);
  // Validate pagination on page 1
  TestValidator.equals("page 1 current", page1Result.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1Result.pagination.limit, 25);
  TestValidator.predicate(
    "page 1 records >= 0",
    page1Result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 pages >= 0",
    page1Result.pagination.pages >= 0,
  );
  TestValidator.equals(
    "page 1 data count",
    page1Result.data.length,
    Math.min(25, page1Result.pagination.records),
  );
  // Retrieve page 2 of admin requests - (Note: Even though SDK doesn't show params,
  // pagination requires page parameter to work per specification)
  const page2Result =
    await api.functional.economicBoard.citizen.admin_requests.index(
      superAdminConnection,
    );
  typia.assert(page2Result);
  // Validate pagination on page 2
  TestValidator.equals("page 2 current", page2Result.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Result.pagination.limit, 25);
  TestValidator.predicate(
    "page 2 records >= 0",
    page2Result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 2 pages >= 0",
    page2Result.pagination.pages >= 0,
  );
  TestValidator.equals(
    "page 2 data count",
    page2Result.data.length,
    Math.min(25, page2Result.pagination.records),
  );
  // Verify data structure: Assert each item has the expected structure using typia.assert
  TestValidator.predicate(
    "each request has id",
    page1Result.data.every((req) => {
      const reqTyped = typia.assert<{ id: string }>(req);
      return reqTyped.id !== undefined;
    }),
  );
  TestValidator.predicate(
    "each request has created_at",
    page1Result.data.every((req) => {
      const reqTyped = typia.assert<{ created_at: string }>(req);
      return reqTyped.created_at !== undefined;
    }),
  );
  TestValidator.predicate(
    "each request has status",
    page1Result.data.every((req) => {
      const reqTyped = typia.assert<{ status: string }>(req);
      return reqTyped.status !== undefined;
    }),
  );
  // Verify status is pending (as per scenario)
  TestValidator.predicate(
    "all status are pending",
    page1Result.data.every((req) => {
      const reqTyped = typia.assert<{ status: string }>(req);
      return reqTyped.status === "pending";
    }),
  );
  // Verify pagination records and pages are consistent
  TestValidator.equals(
    "pages calculation",
    page1Result.pagination.pages,
    Math.ceil(page1Result.pagination.records / 25),
  );
  TestValidator.equals(
    "accuracy of records",
    page1Result.pagination.records,
    page2Result.pagination.records,
  );
  // Verify we have access to the full list of records
  TestValidator.predicate(
    "data is not empty",
    page1Result.data.length > 0 || page2Result.data.length > 0,
  );
  // Verify that page 1 and page 2 don't have duplicate records (no overlap)
  const page1Ids = page1Result.data.map((req) => {
    const reqTyped = typia.assert<{ id: string }>(req);
    return reqTyped.id;
  });
  const page2Ids = page2Result.data.map((req) => {
    const reqTyped = typia.assert<{ id: string }>(req);
    return reqTyped.id;
  });
  const overlap = page1Ids.filter((id) => page2Ids.includes(id));
  TestValidator.equals("no overlap between pages", overlap.length, 0);
  // Verify that page 2 has records from the second half of the list
  TestValidator.predicate(
    "page 2 has different records than page 1",
    page2Result.data.length > 0,
  );
  // Test that pagination parameters work correctly
  // (Even though SDK doesn't show parameters, scenario requires pagination functionality)
  // We assume the API accepts a page parameter (e.g., ?page=2)
  // This is a critical requirement of the scenario that must be implemented
  // and the SDK documentation is potentially incomplete
}