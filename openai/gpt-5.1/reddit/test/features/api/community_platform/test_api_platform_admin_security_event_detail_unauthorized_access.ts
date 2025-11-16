import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformUserSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSecurityEvent";

export async function test_api_platform_admin_security_event_detail_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Seed platform admin and account status, and obtain a valid security event id
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  const statusCreateBody = {
    key: RandomGenerator.alphaNumeric(8),
    label: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createdStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      { body: statusCreateBody },
    );
  typia.assert(createdStatus);

  const seededEvent: ICommunityPlatformUserSecurityEvent =
    await api.functional.communityPlatform.platformAdmin.userSecurityEvents.at(
      connection,
      {
        securityEventId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(seededEvent);

  // 2. Build unauthenticated connection by clearing headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. Unauthenticated request must fail with 401/403
  await TestValidator.httpError(
    "unauthenticated access to userSecurityEvents.at must be rejected",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.platformAdmin.userSecurityEvents.at(
        unauthenticatedConnection,
        { securityEventId: seededEvent.id },
      );
    },
  );

  // 4. Request with invalid/expired token must also fail
  const invalidTokenConnection: api.IConnection = {
    ...connection,
    headers: {
      ...(connection.headers ?? {}),
      Authorization: "Bearer invalid_or_expired_token",
    },
  };

  await TestValidator.httpError(
    "invalid token access to userSecurityEvents.at must be rejected",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.platformAdmin.userSecurityEvents.at(
        invalidTokenConnection,
        { securityEventId: seededEvent.id },
      );
    },
  );
}
