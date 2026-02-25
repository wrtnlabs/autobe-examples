import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardErrorLog";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardErrorLog";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_error_log_admin_search_empty_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 创建管理员连接并认证
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 测试 1: 使用未来日期范围搜索（保证空结果）
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1);
  const futureSearch =
    await api.functional.discussionBoard.admin.error_logs.index(
      adminConnection,
      {
        body: {
          occurred_at_from: futureDate.toISOString(),
          occurred_at_to: new Date(
            futureDate.getTime() + 86400000,
          ).toISOString(), // +1 天
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(futureSearch);
  // 访问嵌套的分页信息
  TestValidator.equals(
    "future date search has zero records",
    futureSearch.pagination.pagination.pagination.pagination.records,
    0,
  );
  TestValidator.equals(
    "future date search has zero pages",
    futureSearch.pagination.pagination.pagination.pagination.pages,
    0,
  );
  TestValidator.equals(
    "future date search has empty data array",
    futureSearch.data.length,
    0,
  );
  // 测试 2: 使用不存在的错误类型搜索
  const nonExistentTypeSearch =
    await api.functional.discussionBoard.admin.error_logs.index(
      adminConnection,
      {
        body: {
          error_type: "NON_EXISTENT_ERROR_TYPE_XYZ123",
          page: 2,
          limit: 5,
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(nonExistentTypeSearch);
  TestValidator.equals(
    "non-existent type search has zero records",
    nonExistentTypeSearch.pagination.pagination.pagination.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent type search has zero pages",
    nonExistentTypeSearch.pagination.pagination.pagination.pagination.pages,
    0,
  );
  TestValidator.equals(
    "non-existent type search has empty data array",
    nonExistentTypeSearch.data.length,
    0,
  );
  // 测试 3: 使用不存在的严重程度搜索
  const nonExistentSeveritySearch =
    await api.functional.discussionBoard.admin.error_logs.index(
      adminConnection,
      {
        body: {
          severity: "NON_EXISTENT_SEVERITY_XYZ",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(nonExistentSeveritySearch);
  TestValidator.equals(
    "non-existent severity search has zero records",
    nonExistentSeveritySearch.pagination.pagination.pagination.pagination
      .records,
    0,
  );
  TestValidator.equals(
    "non-existent severity search has zero pages",
    nonExistentSeveritySearch.pagination.pagination.pagination.pagination.pages,
    0,
  );
  TestValidator.equals(
    "non-existent severity search has empty data array",
    nonExistentSeveritySearch.data.length,
    0,
  );
  // 测试 4: 使用空结果测试分页边界
  const paginationTest =
    await api.functional.discussionBoard.admin.error_logs.index(
      adminConnection,
      {
        body: {
          occurred_at_from: futureDate.toISOString(),
          page: 999,
          limit: 50,
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(paginationTest);
  TestValidator.equals(
    "high page number with empty results has zero records",
    paginationTest.pagination.pagination.pagination.pagination.records,
    0,
  );
  TestValidator.equals(
    "high page number with empty results has zero pages",
    paginationTest.pagination.pagination.pagination.pagination.pages,
    0,
  );
  TestValidator.equals(
    "high page number with empty results has empty data",
    paginationTest.data.length,
    0,
  );
}
