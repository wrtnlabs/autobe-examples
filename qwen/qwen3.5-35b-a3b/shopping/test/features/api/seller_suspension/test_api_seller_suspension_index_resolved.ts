import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerSuspension";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_suspension_index_resolved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Query resolved suspensions with date range filter
  const resolvedAtDate = new Date().toISOString();
  const suspendedFromDate = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 30 days ago
  const suspendedToDate = new Date().toISOString();
  const result =
    await api.functional.ecommerceMall.administrator.seller_suspensions.index(
      adminConnection,
      {
        body: {
          resolved_at_status: "resolved",
          suspended_at_from: suspendedFromDate,
          suspended_at_to: suspendedToDate,
          page: 1,
          limit: 20,
          sort_by: "suspended_at",
          sort_order: "desc",
        } satisfies IEcommerceMallSellerSuspension.IRequest,
      },
    );
  typia.assert(result);
  // 3. Validate pagination structure
  TestValidator.equals(
    "pagination has current page",
    result.pagination.current,
    1,
  );
  TestValidator.equals("pagination has limit", result.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    result.pagination.pages >= 0,
  );
  // 4. Validate all returned suspensions are resolved
  for (const suspension of result.data) {
    typia.assert(suspension);
    // resolved_at must be populated for resolved suspensions
    TestValidator.predicate(
      "resolved suspension has resolved_at timestamp",
      suspension.resolved_at !== null,
    );
    // suspended_at must be valid ISO date string
    TestValidator.predicate("suspended_at is valid date-time format", () => {
      try {
        new Date(suspension.suspended_at);
        return true;
      } catch {
        return false;
      }
    });
    // suspended_at must be within the filter range
    TestValidator.predicate("suspended_at is within date range", () => {
      const suspendedAt = new Date(suspension.suspended_at);
      const fromDate = new Date(suspendedFromDate);
      const toDate = new Date(suspendedToDate);
      return suspendedAt >= fromDate && suspendedAt <= toDate;
    });
    // 5. Validate suspendedByAdmin relationship exists
    TestValidator.notEquals(
      "suspendedByAdmin is not null",
      suspension.suspendedByAdmin,
      null,
    );
    typia.assert(suspension.suspendedByAdmin);
    TestValidator.equals(
      "suspendedByAdmin has id",
      typeof suspension.suspendedByAdmin.id,
      "string",
    );
    TestValidator.equals(
      "suspendedByAdmin has email",
      typeof suspension.suspendedByAdmin.email,
      "string",
    );
    TestValidator.equals(
      "suspendedByAdmin has displayName",
      typeof suspension.suspendedByAdmin.displayName,
      "string",
    );
    // Validate UUID format for IDs
    TestValidator.predicate(
      "suspendedByAdmin.id is valid UUID",
      /^[0-9a-f-]{36}$/i.test(suspension.suspendedByAdmin.id),
    );
    TestValidator.predicate(
      "suspendedByAdmin.email is valid email",
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(suspension.suspendedByAdmin.email),
    );
  }
  // 6. Test pagination with different page
  const secondPageResult =
    await api.functional.ecommerceMall.administrator.seller_suspensions.index(
      adminConnection,
      {
        body: {
          resolved_at_status: "resolved",
          suspended_at_from: suspendedFromDate,
          suspended_at_to: suspendedToDate,
          page: 2,
          limit: 10,
        } satisfies IEcommerceMallSellerSuspension.IRequest,
      },
    );
  typia.assert(secondPageResult);
  TestValidator.equals(
    "second page has correct current",
    secondPageResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page has correct limit",
    secondPageResult.pagination.limit,
    10,
  );
}
