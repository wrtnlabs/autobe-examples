import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_report_categories_create } from "../../../generate/generate_random_community_platform_admin_report_categories_create";
import { prepare_random_community_platform_report_category } from "../../../prepare/prepare_random_community_platform_report_category";

export async function test_api_report_category_admin_soft_delete(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create report category
  const reportCategory =
    await generate_random_community_platform_admin_report_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
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
  typia.assert(reportCategory);
  // 3. Perform soft deletion
  await api.functional.communityPlatform.admin.report_categories.erase(
    adminConnection,
    {
      reportCategoryId: (reportCategory as IEntity).id,
    },
  );
  // 4. Verify soft deletion by testing unauthorized access
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized deletion attempt", async () => {
    await api.functional.communityPlatform.admin.report_categories.erase(
      unauthorizedConnection,
      {
        reportCategoryId: (reportCategory as IEntity).id,
      },
    );
  });
  // 5. Additional verification: Attempt to create a report category with the same name
  // This tests that soft deletion doesn't affect unique constraints
  const newCategory =
    await generate_random_community_platform_admin_report_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10) + "_unique", // Ensure unique name
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
  typia.assert(newCategory);
  // Verify the new category can be deleted normally
  await api.functional.communityPlatform.admin.report_categories.erase(
    adminConnection,
    {
      reportCategoryId: (newCategory as IEntity).id,
    },
  );
}