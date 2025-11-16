import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

export async function test_api_report_reason_category_detail_not_found_for_unknown_code(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin to obtain an authenticated context.
  const joinBody = {
    username: RandomGenerator.alphabets(12),
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

  // 2. Create at least one real report reason category so the table is not empty.
  const existingCodeBase = `existing_${RandomGenerator.alphaNumeric(12)}`;

  const createBody = {
    code: existingCodeBase,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    is_user_visible: true,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;

  const createdCategory: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdCategory);

  // Verify that created category code matches the request code.
  TestValidator.equals(
    "created category code should match requested code",
    createdCategory.code,
    createBody.code,
  );

  // 3. Construct an unknown code that is guaranteed to be different.
  let unknownCode = `unknown_${RandomGenerator.alphaNumeric(16)}`;
  if (unknownCode === createBody.code) {
    unknownCode = `${unknownCode}_alt`;
  }

  // 4. Calling detail endpoint with an unknown code should result in an error
  //    (platform's not-found style behavior). We do not assert specific status
  //    codes or messages, only that an error is thrown.
  await TestValidator.error(
    "requesting non-existent report reason category code should fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.reportReasonCategories.at(
        connection,
        {
          reportReasonCategoryCode: unknownCode,
        },
      );
    },
  );
}
