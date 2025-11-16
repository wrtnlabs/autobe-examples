import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_platform_admin_cannot_delete_nonexistent_report(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator to obtain an authenticated context
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Generate a random reportId that should not correspond to any existing report
  const nonexistentReportId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Attempt to delete the non-existent report and assert that an error is thrown
  await TestValidator.error(
    "platform admin cannot delete non-existent report",
    async () => {
      await api.functional.communityPlatform.platformAdmin.reports.erase(
        connection,
        {
          reportId: nonexistentReportId,
        },
      );
    },
  );
}
