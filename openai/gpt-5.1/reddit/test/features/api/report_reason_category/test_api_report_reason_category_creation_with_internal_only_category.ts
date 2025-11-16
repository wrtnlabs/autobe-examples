import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

export async function test_api_report_reason_category_creation_with_internal_only_category(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new platform administrator
  const joinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create an internal-only, active report reason category
  const code = `internal_policy_violation_${RandomGenerator.alphaNumeric(6)}`;
  const name = "Internal policy violation";
  const description = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 4,
    wordMax: 10,
  });

  const createBody = {
    code,
    name,
    description,
    is_user_visible: false,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;

  const category: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(category);

  // 3. Business-level assertions on the created category
  TestValidator.equals(
    "created category code matches input",
    category.code,
    code,
  );
  TestValidator.equals(
    "created category name matches input",
    category.name,
    name,
  );
  TestValidator.equals(
    "created category description matches input",
    category.description,
    description,
  );
  TestValidator.equals(
    "created category is_user_visible is false (internal-only)",
    category.is_user_visible,
    false,
  );
  TestValidator.equals(
    "created category is_active is true",
    category.is_active,
    true,
  );

  // 4. Sanity checks on lifecycle timestamps and deletion flag, relying on typia for strict typing
  TestValidator.predicate(
    "created_at and updated_at are non-empty strings",
    category.created_at.length > 0 && category.updated_at.length > 0,
  );
}
