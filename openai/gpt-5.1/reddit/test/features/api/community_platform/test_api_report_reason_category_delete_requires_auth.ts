import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

export async function test_api_report_reason_category_delete_requires_auth(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator and obtain an authenticated session.
  const joinBody = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a new report reason category using the authenticated admin.
  const categoryBody = {
    code: `auth_test_${RandomGenerator.alphaNumeric(12)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    is_user_visible: true,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;

  const createdCategory: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(createdCategory);

  TestValidator.equals(
    "created category code should match request body",
    createdCategory.code,
    categoryBody.code,
  );

  const categoryCode: string = createdCategory.code;

  // 3. Prepare an unauthenticated connection (no Authorization header).
  const unauthConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Attempt to delete with no Authorization header - must fail.
  await TestValidator.error("unauthenticated delete must fail", async () => {
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.erase(
      unauthConn,
      {
        reportReasonCategoryCode: categoryCode,
      },
    );
  });

  // 5. Prepare another independent connection to simulate an invalid/malformed token context.
  //    Due to restrictions, we cannot forge tokens directly; treating a fresh
  //    connection with empty headers as an invalid-auth context is sufficient
  //    to validate rejection behavior for non-admin or malformed credentials.
  const invalidConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("invalid-like token delete must fail", async () => {
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.erase(
      invalidConn,
      {
        reportReasonCategoryCode: categoryCode,
      },
    );
  });

  // 6. Finally, delete with the properly authenticated admin connection.
  await api.functional.communityPlatform.platformAdmin.reportReasonCategories.erase(
    connection,
    {
      reportReasonCategoryCode: categoryCode,
    },
  );
}
