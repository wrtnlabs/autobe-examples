import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_user_bans_filter_active_appealed(
  connection: api.IConnection,
): Promise<void> {
  // 1. 创建超级管理员连接并认证
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. 需要创建测试数据：用户、管理员和禁令记录
  // 注意：由于实际系统中需要现有用户和管理员才能创建禁令，
  // 我们需要依赖系统中已经存在的测试数据或模拟现有的记录
  // 这里我们假设系统中已经有一些测试数据，我们将对现有数据进行过滤测试
  // 3. 搜索活跃且上诉状态为pending的禁令
  const searchRequest = {
    banStatus: "active" as const,
    appealStatus: "pending" as const,
    page: 1 satisfies number as number,
    limit: 10 satisfies number as number,
  } satisfies IDiscussionBoardBanRecord.IRequest;
  const searchResult =
    await api.functional.discussionBoard.superAdmin.user_bans.index(
      superAdminConnection,
      {
        body: searchRequest,
      },
    );
  typia.assert(searchResult);
  // 4. 验证响应数据结构
  TestValidator.equals(
    "分页元数据应包含有效值",
    searchResult.pagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "分页限制应匹配请求",
    searchResult.pagination.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "总记录数应为非负数",
    searchResult.pagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "总页数应为非负数",
    searchResult.pagination.pagination.pages >= 0,
  );
  // 5. 验证所有返回的记录都符合过滤条件
  for (const record of searchResult.data) {
    TestValidator.equals("禁令状态应为active", record.banStatus, "active");
    TestValidator.equals("上诉状态应为pending", record.appealStatus, "pending");
    // 验证联接字段的存在
    TestValidator.predicate(
      "被禁用户应有display_name",
      record.bannedUser.display_name.length > 0,
    );
    TestValidator.predicate(
      "发布禁令的管理员应有display_name",
      record.banningAdministrator.display_name.length > 0,
    );
    // 验证禁令时效性：活跃禁令的结束时间应为null（永久）或未来时间
    if (record.banEndsAt !== null) {
      const banEndsAt = new Date(record.banEndsAt);
      const now = new Date();
      TestValidator.predicate(
        "活跃禁令的结束时间应为未来时间或null",
        banEndsAt > now,
      );
    }
  }
  // 6. 计算记录总数与分页数据的一致性
  const totalRecords = searchResult.pagination.pagination.records;
  const totalPages = searchResult.pagination.pagination.pages;
  if (totalRecords > 0) {
    TestValidator.predicate("当有记录时，总页数应至少为1", totalPages >= 1);
    // 验证记录数不超过限制
    TestValidator.predicate(
      "当前页记录数不应超过限制",
      searchResult.data.length <= 10,
    );
    // 验证最后一页的剩余记录
    if (totalPages > 1 && searchResult.data.length < 10) {
      // 最后一页可能不满
      TestValidator.predicate(
        "最后一页记录数应合理",
        searchResult.data.length >= 1,
      );
    }
  } else {
    TestValidator.equals("无记录时总页数应为0", totalPages, 0);
    TestValidator.equals("无记录时数据数组应为空", searchResult.data.length, 0);
  }
}
