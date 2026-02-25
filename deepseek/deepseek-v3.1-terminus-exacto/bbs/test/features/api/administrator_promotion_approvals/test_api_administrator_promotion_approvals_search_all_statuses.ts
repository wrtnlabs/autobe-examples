import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionApproval";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_administrator_promotion_approvals_search_all_statuses(
  connection: api.IConnection,
): Promise<void> {
  // 1. 创建管理员连接并进行授权
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. 测试所有状态过滤器
  const statuses: ("pending" | "approved" | "rejected" | null)[] = [
    "pending",
    "approved",
    "rejected",
    null,
  ];
  for (const status of statuses) {
    const page = typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>();
    const limit = typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >();
    const searchBody = {
      status,
      page,
      limit,
    } satisfies IDiscussionBoardAdministratorPromotionApproval.IRequest;
    const response =
      await api.functional.discussionBoard.admin.administrator_promotion_approvals.index(
        adminConnection,
        {
          body: searchBody,
        },
      );
    typia.assert(response);
    // 3. 验证分页元数据
    TestValidator.equals(
      `pagination.current for status ${status ?? "all"}`,
      response.pagination.pagination.pagination.pagination.current,
      page,
    );
    TestValidator.equals(
      `pagination.limit for status ${status ?? "all"}`,
      response.pagination.pagination.pagination.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      `pagination.records non-negative for status ${status ?? "all"}`,
      response.pagination.pagination.pagination.pagination.records >= 0,
    );
    TestValidator.predicate(
      `pagination.pages non-negative for status ${status ?? "all"}`,
      response.pagination.pagination.pagination.pagination.pages >= 0,
    );
    // 4. 验证记录数据结构
    for (const approval of response.data) {
      typia.assert(approval);
      TestValidator.predicate(
        `approval has id for status ${status ?? "all"}`,
        typeof approval.id === "string" && approval.id.length > 0,
      );
      TestValidator.predicate(
        `approval has user for status ${status ?? "all"}`,
        typeof approval.user.id === "string" && approval.user.id.length > 0,
      );
      TestValidator.predicate(
        `approval has reason for status ${status ?? "all"}`,
        typeof approval.reason === "string",
      );
      TestValidator.predicate(
        `approval has valid status for status ${status ?? "all"}`,
        ["pending", "approved", "rejected"].includes(approval.status),
      );
      TestValidator.predicate(
        `approval has created_at for status ${status ?? "all"}`,
        typeof approval.created_at === "string" &&
          approval.created_at.length > 0,
      );
      if (status === "approved") {
        TestValidator.predicate(
          `approved approval has approved_at for status ${status}`,
          approval.approved_at !== null,
        );
        TestValidator.predicate(
          `approved approval has no rejected_at for status ${status}`,
          approval.rejected_at === null,
        );
      } else if (status === "rejected") {
        TestValidator.predicate(
          `rejected approval has rejected_at for status ${status}`,
          approval.rejected_at !== null,
        );
        TestValidator.predicate(
          `rejected approval has no approved_at for status ${status}`,
          approval.approved_at === null,
        );
      }
    }
  }
  // 5. 测试空搜索参数
  const emptySearch = {
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardAdministratorPromotionApproval.IRequest;
  const emptyResponse =
    await api.functional.discussionBoard.admin.administrator_promotion_approvals.index(
      adminConnection,
      {
        body: emptySearch,
      },
    );
  typia.assert(emptyResponse);
  TestValidator.equals(
    "empty search pagination.current",
    emptyResponse.pagination.pagination.pagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty search pagination.limit",
    emptyResponse.pagination.pagination.pagination.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "empty search pagination.records non-negative",
    emptyResponse.pagination.pagination.pagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "empty search pagination.pages non-negative",
    emptyResponse.pagination.pagination.pagination.pagination.pages >= 0,
  );
}
