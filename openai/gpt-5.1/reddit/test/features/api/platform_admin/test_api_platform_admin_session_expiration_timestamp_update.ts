import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformSetting";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPlatformadminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadminSession";

export async function test_api_platform_admin_session_expiration_timestamp_update(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin and obtain an authorized payload
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(10)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a platform setting as this platform admin
  const settingBody = {
    key: `session.lifetime.${RandomGenerator.alphaNumeric(8)}`,
    value: JSON.stringify({ defaultLifetimeMinutes: 60 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    is_active: true,
  } satisfies ICommunityPlatformPlatformSetting.ICreate;

  const setting: ICommunityPlatformPlatformSetting =
    await api.functional.communityPlatform.platformAdmin.platformSettings.create(
      connection,
      {
        body: settingBody,
      },
    );
  typia.assert(setting);

  // 3. Prepare the target expiration timestamp (ISO 8601 string for now)
  const requestedExpiredAt: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  // 4. Update a platform admin session's expired_at metadata
  // NOTE: We have no API to fetch the actual sessionId created by join, so we
  // use random UUIDs here while still validating type shape and expired_at echo.
  const updateBody = {
    expired_at: requestedExpiredAt,
  } satisfies ICommunityPlatformPlatformadminSession.IUpdate;

  const updatedSession: ICommunityPlatformPlatformadminSession =
    await api.functional.communityPlatform.platformAdmin.platformAdmins.sessions.update(
      connection,
      {
        platformAdminId: typia.random<string & tags.Format<"uuid">>(),
        sessionId: typia.random<string & tags.Format<"uuid">>(),
        body: updateBody,
      },
    );
  typia.assert(updatedSession);

  // 5. Validate business expectations around expired_at
  TestValidator.predicate(
    "session expired_at should be set when provided in update body",
    updatedSession.expired_at !== null &&
      updatedSession.expired_at !== undefined,
  );

  TestValidator.equals(
    "session expired_at should equal requested expiration timestamp",
    updatedSession.expired_at,
    requestedExpiredAt,
  );
}
