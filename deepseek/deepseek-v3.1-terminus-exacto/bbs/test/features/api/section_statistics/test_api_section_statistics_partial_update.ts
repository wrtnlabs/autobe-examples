import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionStatistic";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_section_statistics_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // 创建一个超级管理员连接
  const superAdminConnection: api.IConnection = { host: connection.host };
  // 1. 注册超级管理员账户
  const joinPassword = RandomGenerator.alphaNumeric(16);
  const joinResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: joinPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(joinResult);
  // 2. 登录超级管理员账户
  const loginCredentials = {
    email: joinResult.email,
    password: joinPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IDiscussionBoardSuperAdmin.ILogin;
  const authorized = await authorize_super_admin_login(superAdminConnection, {
    body: loginCredentials,
  });
  typia.assert(authorized);
  // 3. 假设系统中已存在一个区，使用随机区ID
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // 4. 部分更新统计信息，只提供viewCount和lastActivityAt
  const updateBody = {
    viewCount: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    lastActivityAt: new Date().toISOString(),
  } satisfies IDiscussionBoardSectionStatistic.IUpdate;
  // 5. 执行部分更新操作
  const updatedStats =
    await api.functional.discussionBoard.superAdmin.sections.statistics.update(
      superAdminConnection,
      {
        sectionId: sectionId,
        body: updateBody,
      },
    );
  typia.assert(updatedStats);
  // 6. 验证更新后的统计信息
  // 验证提供更新的字段正确更新
  TestValidator.equals(
    "view count updated",
    updatedStats.view_count,
    updateBody.viewCount,
  );
  TestValidator.equals(
    "last activity at updated",
    updatedStats.last_activity_at,
    updateBody.lastActivityAt,
  );
  // 验证未提供的可选字段保持原值（如果更新成功）
  // 注意：由于不能假定默认值，我们只验证它们是非负整数
  TestValidator.predicate(
    "article count valid",
    updatedStats.article_count >= 0,
  );
  TestValidator.predicate(
    "comment count valid",
    updatedStats.comment_count >= 0,
  );
  // 验证section字段存在
  TestValidator.predicate("has section", updatedStats.section !== undefined);
}
