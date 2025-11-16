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

/**
 * Happy-path validation for retrieving detailed information about a platform
 * administrator session.
 *
 * Business flow:
 *
 * 1. Register a new platform administrator via the join endpoint, which creates an
 *    initial session and configures the connection with a valid platformAdmin
 *    access token.
 * 2. Create a baseline platform setting row so that the platform is in a valid
 *    configured state for admin operations.
 * 3. List sessions for the newly created platform admin using the sessions index
 *    endpoint (page 1, limit 10) and pick one session summary from the returned
 *    page.
 * 4. Retrieve detailed information for the chosen session via the sessions.at
 *    endpoint.
 * 5. Verify that core identity fields match expectations, including the platform
 *    admin owner id and the session id, and that the response structure matches
 *    ICommunityPlatformPlatformadminSession.
 * 6. Call the same GET endpoint a second time with identical parameters and verify
 *    that the second response is deeply equal to the first, demonstrating that
 *    the endpoint is read-only and idempotent.
 */
export async function test_api_platform_admin_session_get_happy_path(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator and obtain authorized profile + token
  const joinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(12)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const authorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  const platformAdminId = authorized.id;

  // 2. Create a baseline platform setting row
  const platformSettingBody = {
    key: `test.setting.${RandomGenerator.alphaNumeric(8)}`,
    value: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    is_active: true,
  } satisfies ICommunityPlatformPlatformSetting.ICreate;

  const platformSetting: ICommunityPlatformPlatformSetting =
    await api.functional.communityPlatform.platformAdmin.platformSettings.create(
      connection,
      {
        body: platformSettingBody,
      },
    );
  typia.assert(platformSetting);

  // 3. List sessions for this platform admin and pick one session summary
  const listRequestBody = {
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformPlatformadminSession.IRequest;

  const page: IPageICommunityPlatformPlatformadminSession.ISummary =
    await api.functional.communityPlatform.platformAdmin.platformAdmins.sessions.index(
      connection,
      {
        platformAdminId,
        body: listRequestBody,
      },
    );
  typia.assert(page);

  await TestValidator.predicate(
    "sessions index should return at least one session for the new admin",
    async () => page.data.length > 0,
  );

  const summary: ICommunityPlatformPlatformadminSession.ISummary = page.data[0];

  // 4. Retrieve detailed information for the chosen session
  const firstSession: ICommunityPlatformPlatformadminSession =
    await api.functional.communityPlatform.platformAdmin.platformAdmins.sessions.at(
      connection,
      {
        platformAdminId,
        sessionId: summary.id,
      },
    );
  typia.assert(firstSession);

  // 5. Validate core identity and ownership fields
  TestValidator.equals(
    "session id from detail should match the summary id",
    firstSession.id,
    summary.id,
  );

  TestValidator.equals(
    "session owner id should match the platform admin id",
    firstSession.community_platform_platformadmin_id,
    platformAdminId,
  );

  await TestValidator.predicate(
    "session expired_at should be either null/undefined or a date-time string (already type-checked by typia)",
    async () =>
      firstSession.expired_at === null ||
      firstSession.expired_at === undefined ||
      typeof firstSession.expired_at === "string",
  );

  // 6. Ensure GET is read-only and idempotent by calling it again and comparing
  const secondSession: ICommunityPlatformPlatformadminSession =
    await api.functional.communityPlatform.platformAdmin.platformAdmins.sessions.at(
      connection,
      {
        platformAdminId,
        sessionId: summary.id,
      },
    );
  typia.assert(secondSession);

  TestValidator.equals(
    "repeated GET on the same session should return identical data (read-only, idempotent)",
    secondSession,
    firstSession,
  );
}
