import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformSetting";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPlatformadminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadminSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPlatformadminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPlatformadminSession";

export async function test_api_platform_admin_sessions_index_basic_listing(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator and start an authenticated session.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    // ip is optional; omit it to let server infer or ignore.
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  const platformAdminId = adminAuthorized.id;

  // 2. Initialize at least one platform settings row.
  const settingBody = {
    key: `test.setting.${RandomGenerator.alphaNumeric(8)}`,
    value: JSON.stringify({ featureFlag: true }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies ICommunityPlatformPlatformSetting.ICreate;

  const platformSetting: ICommunityPlatformPlatformSetting =
    await api.functional.communityPlatform.platformAdmin.platformSettings.create(
      connection,
      {
        body: settingBody,
      },
    );
  typia.assert(platformSetting);

  // 3. Call the sessions index endpoint for this platform admin with basic pagination.
  const requestBody = {
    page: 1,
    limit: 10,
    created_at_from: null,
    created_at_to: null,
  } satisfies ICommunityPlatformPlatformadminSession.IRequest;

  const page: IPageICommunityPlatformPlatformadminSession.ISummary =
    await api.functional.communityPlatform.platformAdmin.platformAdmins.sessions.index(
      connection,
      {
        platformAdminId,
        body: requestBody,
      },
    );
  typia.assert(page);

  // 4. Validate pagination metadata reflects our requested page and limit.
  const pagination: IPage.IPagination = page.pagination;
  typia.assert(pagination);

  TestValidator.equals(
    "pagination current page should be 1",
    pagination.current,
    1,
  );
  TestValidator.equals("pagination limit should be 10", pagination.limit, 10);

  // 5. Validate that all returned session summaries belong to the same platform admin.
  const sessions: ICommunityPlatformPlatformadminSession.ISummary[] = page.data;

  for (const session of sessions) {
    typia.assert(session);
    TestValidator.equals(
      "session belongs to requested platform admin",
      session.platformAdmin.id,
      platformAdminId,
    );
  }
}
