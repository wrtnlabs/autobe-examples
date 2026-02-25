import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_admin_report_categories_create } from "../../../generate/generate_random_community_platform_admin_report_categories_create";
import { prepare_random_community_platform_report_category } from "../../../prepare/prepare_random_community_platform_report_category";

export async function test_api_report_category_unauthorized_non_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. Create report category as admin
  const reportCategory =
    await generate_random_community_platform_admin_report_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          display_name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          severity_level: RandomGenerator.pick([
            "low",
            "medium",
            "high",
            "critical",
          ] as const),
          moderation_guidelines: RandomGenerator.paragraph({ sentences: 2 }),
          is_active: true,
        } satisfies ICommunityPlatformReportCategory.ICreate,
      },
    );
  const reportCategoryEntity = typia.assert<IEntity>(reportCategory);
  // 3. Regular user setup and authentication
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: null,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // 4. Attempt deletion with non-admin user (should fail)
  await TestValidator.error(
    "non-admin cannot delete report category",
    async () => {
      await api.functional.communityPlatform.admin.report_categories.erase(
        userConnection,
        {
          reportCategoryId: reportCategoryEntity.id,
        },
      );
    },
  );
  // 5. Verify report category still exists by attempting to delete it as admin
  await api.functional.communityPlatform.admin.report_categories.erase(
    adminConnection,
    {
      reportCategoryId: reportCategoryEntity.id,
    },
  );
  // 6. Verify admin can delete successfully (no error thrown)
  TestValidator.predicate("admin successfully deleted report category", true);
}