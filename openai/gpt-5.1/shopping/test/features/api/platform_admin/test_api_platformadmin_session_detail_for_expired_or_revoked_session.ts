import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformadminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformadminSession";

export async function test_api_platformadmin_session_detail_for_expired_or_revoked_session(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin to obtain authenticated context
  const joinRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinRequestBody,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Fetch a specific session detail for this admin.
  // We use the real admin id from join, but the session id is generated
  // randomly as the test environment may use simulated data.
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  const session =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.sessions.at(
      connection,
      {
        platformAdminId: admin.id,
        sessionId,
      },
    );
  typia.assert<IShoppingMallPlatformadminSession>(session);

  // 3. Basic identity and ownership checks
  TestValidator.equals(
    "session.platform_admin_id matches admin.id",
    session.platform_admin_id,
    admin.id,
  );

  TestValidator.equals(
    "session.platformAdmin.id matches platform_admin_id",
    session.platformAdmin.id,
    session.platform_admin_id,
  );

  // 4. Status flag consistency checks
  if (session.is_active) {
    TestValidator.predicate(
      "active session must not be expired",
      !session.is_expired,
    );
    TestValidator.predicate(
      "active session must not be revoked",
      !session.is_revoked,
    );
  }

  if (session.is_expired) {
    TestValidator.predicate(
      "expired session must be inactive",
      !session.is_active,
    );
    TestValidator.predicate(
      "expired session must have non-null expired_at",
      session.expired_at !== null && session.expired_at !== undefined,
    );
  }

  if (session.is_revoked) {
    TestValidator.predicate(
      "revoked session must be inactive",
      !session.is_active,
    );
    TestValidator.predicate(
      "revoked session must have non-null revoked_at",
      session.revoked_at !== null && session.revoked_at !== undefined,
    );
  }

  if (session.expired_at === null || session.expired_at === undefined) {
    TestValidator.predicate(
      "session without expired_at must not be marked expired",
      !session.is_expired,
    );
  }

  if (session.revoked_at === null || session.revoked_at === undefined) {
    TestValidator.predicate(
      "session without revoked_at must not be marked revoked",
      !session.is_revoked,
    );
  }

  // 5. Timestamp ordering checks
  const createdAtMs = new Date(session.created_at).getTime();

  if (session.last_activity_at !== undefined) {
    const lastActivityMs = new Date(session.last_activity_at).getTime();
    TestValidator.predicate(
      "last_activity_at must not be before created_at",
      createdAtMs <= lastActivityMs,
    );
  }

  if (session.expired_at !== null && session.expired_at !== undefined) {
    const expiredAtMs = new Date(session.expired_at).getTime();
    TestValidator.predicate(
      "expired_at must not be before created_at",
      createdAtMs <= expiredAtMs,
    );
  }

  if (session.revoked_at !== null && session.revoked_at !== undefined) {
    const revokedAtMs = new Date(session.revoked_at).getTime();
    TestValidator.predicate(
      "revoked_at must not be before created_at",
      createdAtMs <= revokedAtMs,
    );
  }

  // 6. Ensure the detail endpoint is read-only and stable by re-fetching
  const sessionAgain =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.sessions.at(
      connection,
      {
        platformAdminId: admin.id,
        sessionId,
      },
    );
  typia.assert<IShoppingMallPlatformadminSession>(sessionAgain);

  TestValidator.equals(
    "session detail is stable across repeated reads",
    sessionAgain,
    session,
  );
}
