import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleQuestionReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleQuestionReport";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallSaleQuestionReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestionReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_sale_questions_report_success_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecureP@ssword1",
    },
  });
  typia.assert(adminAuthorized);
  // Token set via authorize_administrator_join internally
  // 2. Prepare request filters with pagination, sorting, and status/date filters
  const page = 1;
  const limit = 10;
  const sortBy = "date";
  const sortOrder: "asc" | "desc" = "desc";
  // Use some valid UUID for sellerId filter (simulate random UUID)
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  // Use realistic date range for filters
  const now = new Date();
  const dateFrom = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days ago
  const dateTo = now.toISOString();
  const status = "answered";
  // Search keyword as substring of some text
  const search = "question";
  const body: IShoppingMallSaleQuestionReport.IRequest = {
    page,
    limit,
    sortBy,
    sortOrder,
    sellerId,
    status,
    dateFrom,
    dateTo,
    search,
  };
  // 3. Fetch the report using the administrator connection
  const response =
    await api.functional.shoppingMall.administrator.reports.sale_questions.index(
      adminConnection,
      { body },
    );
  typia.assert(response);
  // 4. Validate pagination metadata
  const pagination = response.pagination;
  TestValidator.predicate(
    "pagination current page >= 1",
    pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit > 0", pagination.limit > 0);
  TestValidator.predicate("pagination records >= 0", pagination.records >= 0);
  TestValidator.predicate("pagination pages >= 0", pagination.pages >= 0);
  TestValidator.predicate(
    "pagination pages correct",
    pagination.pages ===
      (pagination.records === 0
        ? 0
        : Math.ceil(pagination.records / pagination.limit)),
  );
  // 5. Validate each data record fields
  for (const record of response.data) {
    typia.assert(record);
    TestValidator.predicate(
      "record.questionCount >= 0",
      record.questionCount >= 0,
    );
    TestValidator.predicate(
      "record.pendingCount >= 0",
      record.pendingCount >= 0,
    );
    TestValidator.predicate(
      "record.answeredCount >= 0",
      record.answeredCount >= 0,
    );
    TestValidator.predicate(
      "record.rejectedCount >= 0",
      record.rejectedCount >= 0,
    );
    // lastAskedAt can be null or valid ISO date-time string
    if (record.lastAskedAt !== null) {
      TestValidator.predicate(
        "record.lastAskedAt ISO date-time format",
        /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.\d+)?Z$/.test(
          record.lastAskedAt,
        ),
      );
    }
  }
  // 6. Aggregate counts by status and verify consistency
  let totalQuestionCount = 0;
  let totalPendingCount = 0;
  let totalAnsweredCount = 0;
  let totalRejectedCount = 0;
  for (const record of response.data) {
    totalQuestionCount += record.questionCount;
    totalPendingCount += record.pendingCount;
    totalAnsweredCount += record.answeredCount;
    totalRejectedCount += record.rejectedCount;
  }
  // Since the report aggregates by sale, these sums should be logical
  // The questionCount should be >= sum of the status counts
  TestValidator.predicate(
    "totalQuestionCount >= sum of status counts",
    totalQuestionCount >=
      totalPendingCount + totalAnsweredCount + totalRejectedCount,
  );
}
