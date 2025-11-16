import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

export async function test_api_report_reason_category_creation_enforces_unique_code(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform administrator so that
  //    subsequent calls run under the platformAdmin actor.
  const joinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "StrongP@ssw0rd!",
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);
  typia.assert<IAuthorizationToken>(admin.token);

  // 2. Create an initial report reason category with a deterministic code.
  //    Use a random suffix to reduce flakiness across test runs while still
  //    asserting uniqueness within this test.
  const baseCode = `spam_${RandomGenerator.alphaNumeric(8)}`;

  const firstCreateBody = {
    code: baseCode,
    name: "Spam or unsolicited content",
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 4,
      wordMax: 10,
    }),
    is_user_visible: true,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;

  const firstCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      {
        body: firstCreateBody,
      },
    );
  typia.assert<ICommunityPlatformReportReasonCategory>(firstCategory);

  // Basic invariants: the returned category should reflect the requested code
  // and flags. We do not over-assert timestamps and IDs.
  TestValidator.equals(
    "created category code matches requested code",
    firstCategory.code,
    firstCreateBody.code,
  );
  TestValidator.equals(
    "created category is_user_visible matches request",
    firstCategory.is_user_visible,
    firstCreateBody.is_user_visible,
  );
  TestValidator.equals(
    "created category is_active matches request",
    firstCategory.is_active,
    firstCreateBody.is_active,
  );

  // 3. Attempt to create a second category with the same code but different
  //    descriptive fields. This should violate the unique constraint on code
  //    and cause the API to reject the request.
  const duplicateCreateBody = {
    code: baseCode, // same code as the first category
    name: "Duplicate spam reason name",
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 8,
    }),
    is_user_visible: false,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;

  await TestValidator.error(
    "creating second report reason category with duplicate code must fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
        connection,
        {
          body: duplicateCreateBody,
        },
      );
    },
  );
}
