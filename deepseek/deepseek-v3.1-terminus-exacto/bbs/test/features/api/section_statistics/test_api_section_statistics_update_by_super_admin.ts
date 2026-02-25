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

export async function test_api_section_statistics_update_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. 创建超级管理员连接并进行身份验证
  const superAdminConnection: api.IConnection = { host: connection.host };
  // 注册并登录超级管理员
  const superAdminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "admin12345",
    href: "http://localhost:3000",
    referrer: "http://localhost:3000",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IDiscussionBoardSuperAdmin.IJoin;
  await authorize_super_admin_join(superAdminConnection, {
    body: superAdminCredentials,
  });
  // 2. 由于无法创建section，使用随机但有效的section ID
  // 在实际环境中，这里应该先创建一个section或使用已知存在的section
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // 3. 准备合理的更新数据
  const updateData = {
    viewCount: typia.random<number & tags.Type<"int32"> & tags.Minimum<100>>(),
    articleCount: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<10>
    >(),
    commentCount: typia.random<number & tags.Type<"int32"> & tags.Minimum<5>>(),
    lastActivityAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 过去的一天
  } satisfies IDiscussionBoardSectionStatistic.IUpdate;
  // 4. 调用API更新统计信息
  const response =
    await api.functional.discussionBoard.superAdmin.sections.statistics.update(
      superAdminConnection,
      {
        sectionId: sectionId,
        body: updateData,
      },
    );
  // 5. 验证响应数据
  typia.assert(response);
  // 验证统计数据匹配
  if (updateData.viewCount !== undefined) {
    TestValidator.equals(
      "view count updated",
      response.view_count,
      updateData.viewCount,
    );
  }
  if (updateData.articleCount !== undefined) {
    TestValidator.equals(
      "article count updated",
      response.article_count,
      updateData.articleCount,
    );
  }
  if (updateData.commentCount !== undefined) {
    TestValidator.equals(
      "comment count updated",
      response.comment_count,
      updateData.commentCount,
    );
  }
  // 验证section摘要存在且ID匹配
  TestValidator.predicate("section summary exists", response.section !== null);
  TestValidator.equals("section id matches", response.section.id, sectionId);
  // 验证时间戳合理性
  TestValidator.predicate(
    "last activity at is valid",
    new Date(response.last_activity_at) <= new Date(),
  );
  TestValidator.predicate(
    "updated_at is valid",
    new Date(response.updated_at) >= new Date(response.created_at),
  );
}
