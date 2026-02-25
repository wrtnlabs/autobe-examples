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

export async function test_api_report_category_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
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
  // Create report category with valid data using utility function
  const reportCategory =
    await generate_random_community_platform_admin_report_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          display_name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          severity_level: RandomGenerator.pick([
            "low",
            "medium",
            "high",
            "critical",
          ] as const),
          moderation_guidelines: RandomGenerator.paragraph({ sentences: 4 }),
          is_active: true,
        } satisfies ICommunityPlatformReportCategory.ICreate,
      },
    );
  typia.assert(reportCategory);
  // Validate severity level is one of the allowed values
  TestValidator.predicate(
    "severity level is valid",
    ["low", "medium", "high", "critical"].includes(
      reportCategory.severity_level ?? "",
    ),
  );
}