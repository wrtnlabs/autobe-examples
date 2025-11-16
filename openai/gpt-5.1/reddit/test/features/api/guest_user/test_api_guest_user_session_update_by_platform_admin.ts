import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformGuestuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuserSession";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_guest_user_session_update_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator and start an authenticated session
  const adminJoinBody = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.console.local/register",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);
  typia.assert<IAuthorizationToken>(admin.token);

  // 2. Create an account status definition as platform admin
  const statusCreateBody = {
    key: `GUEST_ACTIVE_${RandomGenerator.alphaNumeric(6)}`,
    label: "Guest Active",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    isLoginAllowed: true,
    isPostingAllowed: false,
    isVotingAllowed: false,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createdStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: statusCreateBody,
      },
    );
  typia.assert<ICommunityPlatformAccountStatus>(createdStatus);

  TestValidator.equals(
    "account status key should match create payload",
    createdStatus.key,
    statusCreateBody.key,
  );
  TestValidator.equals(
    "account status label should match create payload",
    createdStatus.label,
    statusCreateBody.label,
  );

  // 3. Prepare guestUserId and sessionId (no create APIs are available, so use random UUIDs)
  const guestUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const sessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. First update call: capture original immutable fields while leaving expired_at unchanged
  const firstUpdateBody = {
    // intentionally omit expired_at to leave it unchanged
  } satisfies ICommunityPlatformGuestuserSession.IUpdate;

  const originalSession: ICommunityPlatformGuestuserSession =
    await api.functional.communityPlatform.platformAdmin.guestUsers.sessions.update(
      connection,
      {
        guestUserId,
        sessionId,
        body: firstUpdateBody,
      },
    );
  typia.assert<ICommunityPlatformGuestuserSession>(originalSession);

  // 5. Second update call: set expired_at to mark the session as administratively closed
  const newExpiredAt: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  const secondUpdateBody = {
    expired_at: newExpiredAt,
  } satisfies ICommunityPlatformGuestuserSession.IUpdate;

  const updatedSession: ICommunityPlatformGuestuserSession =
    await api.functional.communityPlatform.platformAdmin.guestUsers.sessions.update(
      connection,
      {
        guestUserId,
        sessionId,
        body: secondUpdateBody,
      },
    );
  typia.assert<ICommunityPlatformGuestuserSession>(updatedSession);

  // 6. Business assertions: only expired_at should change; core identity fields remain consistent
  TestValidator.equals(
    "session id must remain stable across updates",
    updatedSession.id,
    originalSession.id,
  );

  TestValidator.equals(
    "guest user id must remain stable across updates",
    updatedSession.guestUser.id,
    originalSession.guestUser.id,
  );

  TestValidator.equals(
    "guest user created_at must remain unchanged",
    updatedSession.guestUser.created_at,
    originalSession.guestUser.created_at,
  );

  TestValidator.equals(
    "session ip should remain unchanged",
    updatedSession.ip,
    originalSession.ip,
  );

  TestValidator.equals(
    "session href should remain unchanged",
    updatedSession.href,
    originalSession.href,
  );

  TestValidator.equals(
    "session referrer should remain unchanged",
    updatedSession.referrer,
    originalSession.referrer,
  );

  TestValidator.equals(
    "session created_at should remain unchanged",
    updatedSession.created_at,
    originalSession.created_at,
  );

  // expired_at is the only mutable field we update and should equal the requested value
  TestValidator.equals(
    "expired_at should be updated to the new administrative timestamp",
    updatedSession.expired_at,
    secondUpdateBody.expired_at ?? null,
  );
}
