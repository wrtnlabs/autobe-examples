import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommercePlatformEventOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEventOfSeller";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformEventOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformEventOfSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_approval_search_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Setup administrator connection using available utility
  const adminConnection: api.IConnection = { host: connection.host };
  // Create admin credentials for login (since join utility doesn't exist)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "test12345";
  // Use the administrator join SDK directly since utility function doesn't exist
  await api.functional.ecommerce.auth.administrator.join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Test 1: Search for rejected status with approval date range (should return empty)
  // This combination is impossible since rejected applications don't have approval dates
  const searchResponse1 =
    await api.functional.ecommerce.administrator.seller_approvals.index(
      adminConnection,
      {
        body: {
          status: "rejected" as const,
          approval_date_start: new Date().toISOString(),
          approval_date_end: new Date().toISOString(),
        } satisfies IEcommercePlatformEventOfSeller.IRequest,
      },
    );
  typia.assert(searchResponse1);
  // Validate empty results with proper pagination metadata
  TestValidator.equals(
    "data array empty for impossible status-date combination",
    searchResponse1.data,
    [],
  );
  TestValidator.equals(
    "records count should be 0",
    searchResponse1.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages count should be 0",
    searchResponse1.pagination.pages,
    0,
  );
  // Test 2: Search for non-existent administrator ID
  const searchResponse2 =
    await api.functional.ecommerce.administrator.seller_approvals.index(
      adminConnection,
      {
        body: {
          administrator_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IEcommercePlatformEventOfSeller.IRequest,
      },
    );
  typia.assert(searchResponse2);
  // Validate empty results
  TestValidator.equals(
    "data array empty for non-existent admin",
    searchResponse2.data,
    [],
  );
  TestValidator.equals(
    "records count should be 0 for non-existent admin",
    searchResponse2.pagination.records,
    0,
  );
  // Test 3: Search for under_review status with approval dates (impossible combination)
  const searchResponse3 =
    await api.functional.ecommerce.administrator.seller_approvals.index(
      adminConnection,
      {
        body: {
          status: "under_review" as const,
          approval_date_start: new Date().toISOString(),
          approval_date_end: new Date().toISOString(),
        } satisfies IEcommercePlatformEventOfSeller.IRequest,
      },
    );
  typia.assert(searchResponse3);
  // Validate empty results for impossible status-date combination
  TestValidator.equals(
    "data array empty for under_review with approval date",
    searchResponse3.data,
    [],
  );
  TestValidator.equals(
    "records count should be 0",
    searchResponse3.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages count should be 0",
    searchResponse3.pagination.pages,
    0,
  );
}
