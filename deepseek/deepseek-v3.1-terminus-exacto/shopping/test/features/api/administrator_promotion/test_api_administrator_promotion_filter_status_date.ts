import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceAdministratorPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorPromotion";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceAdministratorPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceAdministratorPromotion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_promotion_filter_status_date(
  connection: api.IConnection,
): Promise<void> {
  // Administrator authentication setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin123!",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(admin);
  // Test status filtering
  const pendingResults =
    await api.functional.ecommerce.administrator.administrator_promotions.index(
      adminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IEcommerceAdministratorPromotion.IRequest,
      },
    );
  typia.assert(pendingResults);
  TestValidator.equals(
    "pending results should only contain pending status",
    pendingResults.data.every((item) => item.status === "pending"),
    true,
  );
  const approvedResults =
    await api.functional.ecommerce.administrator.administrator_promotions.index(
      adminConnection,
      {
        body: {
          status: "approved",
          page: 1,
          limit: 10,
        } satisfies IEcommerceAdministratorPromotion.IRequest,
      },
    );
  typia.assert(approvedResults);
  TestValidator.equals(
    "approved results should only contain approved status",
    approvedResults.data.every((item) => item.status === "approved"),
    true,
  );
  const rejectedResults =
    await api.functional.ecommerce.administrator.administrator_promotions.index(
      adminConnection,
      {
        body: {
          status: "rejected",
          page: 1,
          limit: 10,
        } satisfies IEcommerceAdministratorPromotion.IRequest,
      },
    );
  typia.assert(rejectedResults);
  TestValidator.equals(
    "rejected results should only contain rejected status",
    rejectedResults.data.every((item) => item.status === "rejected"),
    true,
  );
  // Test date range filtering
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const dateRangeResults =
    await api.functional.ecommerce.administrator.administrator_promotions.index(
      adminConnection,
      {
        body: {
          created_at_from: oneWeekAgo.toISOString(),
          created_at_to: oneMonthFromNow.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IEcommerceAdministratorPromotion.IRequest,
      },
    );
  typia.assert(dateRangeResults);
  if (dateRangeResults.data.length > 0) {
    for (const item of dateRangeResults.data) {
      const createdAt = new Date(item.created_at);
      TestValidator.predicate(
        `item ${item.id} created_at should be within date range`,
        createdAt >= oneWeekAgo && createdAt <= oneMonthFromNow,
      );
    }
  }
  // Test approved_at filtering
  const approvedAtResults =
    await api.functional.ecommerce.administrator.administrator_promotions.index(
      adminConnection,
      {
        body: {
          status: "approved",
          approved_at_from: oneWeekAgo.toISOString(),
          approved_at_to: oneMonthFromNow.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IEcommerceAdministratorPromotion.IRequest,
      },
    );
  typia.assert(approvedAtResults);
  // Test rejected_at filtering
  const rejectedAtResults =
    await api.functional.ecommerce.administrator.administrator_promotions.index(
      adminConnection,
      {
        body: {
          status: "rejected",
          rejected_at_from: oneWeekAgo.toISOString(),
          rejected_at_to: oneMonthFromNow.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IEcommerceAdministratorPromotion.IRequest,
      },
    );
  typia.assert(rejectedAtResults);
  // Test combined status and date filters
  const combinedResults =
    await api.functional.ecommerce.administrator.administrator_promotions.index(
      adminConnection,
      {
        body: {
          status: "pending",
          created_at_from: oneWeekAgo.toISOString(),
          created_at_to: oneMonthFromNow.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IEcommerceAdministratorPromotion.IRequest,
      },
    );
  typia.assert(combinedResults);
  if (combinedResults.data.length > 0) {
    TestValidator.equals(
      "combined filter should only return pending status",
      combinedResults.data.every((item) => item.status === "pending"),
      true,
    );
    for (const item of combinedResults.data) {
      const createdAt = new Date(item.created_at);
      TestValidator.predicate(
        `item ${item.id} should be within combined filter range`,
        createdAt >= oneWeekAgo && createdAt <= oneMonthFromNow,
      );
    }
  }
  // Test null status filter (returns all statuses)
  const allStatusResults =
    await api.functional.ecommerce.administrator.administrator_promotions.index(
      adminConnection,
      {
        body: {
          status: null,
          page: 1,
          limit: 10,
        } satisfies IEcommerceAdministratorPromotion.IRequest,
      },
    );
  typia.assert(allStatusResults);
  // Validate pagination structure
  TestValidator.predicate("pagination should have correct structure", () => {
    const pagination = allStatusResults.pagination;
    return (
      typeof pagination.current === "number" &&
      typeof pagination.limit === "number" &&
      typeof pagination.records === "number" &&
      typeof pagination.pages === "number" &&
      pagination.current >= 1 &&
      pagination.limit >= 1 &&
      pagination.records >= 0 &&
      pagination.pages >= 0
    );
  });
}
