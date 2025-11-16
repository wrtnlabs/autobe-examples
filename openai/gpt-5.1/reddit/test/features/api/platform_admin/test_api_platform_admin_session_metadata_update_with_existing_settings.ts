import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformSetting";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPlatformadminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadminSession";

/**
 * Validate updating non-authentication metadata of a platform admin session
 * when platform-wide settings already exist.
 *
 * Business objectives covered by this test:
 *
 * 1. A platform administrator can register (join) and obtain an authenticated
 *    context with JWT tokens and an associated session.
 * 2. An authenticated platform administrator can create a platform-wide
 *    configuration setting.
 * 3. The platform admin session metadata update endpoint accepts
 *    ICommunityPlatformPlatformadminSession.IUpdate payloads and returns a
 *    fully typed ICommunityPlatformPlatformadminSession response.
 * 4. Only non-authentication metadata fields (ip, href, referrer, expired_at) are
 *    updated by the session update endpoint; identity fields remain stable
 *    across multiple update calls for the same (platformAdminId, sessionId).
 * 5. The session update endpoint operates purely on session metadata and does not
 *    expose any token information in its response type.
 *
 * Note:
 *
 * - The available SDK does not expose any API to list or read concrete admin
 *   sessions created during join, so this test cannot bind a real persisted
 *   session id. Instead, it relies on the simulator behavior and focuses on DTO
 *   correctness and update semantics between two calls using the same
 *   (platformAdminId, sessionId) pair.
 */
export async function test_api_platform_admin_session_metadata_update_with_existing_settings(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator (join) to obtain an
  //    authenticated platformAdmin context.
  const joinBody = typia.random<ICommunityPlatformPlatformadmin.IJoin>();
  const authorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(authorized);

  // 2. Create a baseline platform-wide configuration setting using the
  //    authenticated platformAdmin context.
  const settingBody = typia.random<ICommunityPlatformPlatformSetting.ICreate>();
  const setting: ICommunityPlatformPlatformSetting =
    await api.functional.communityPlatform.platformAdmin.platformSettings.create(
      connection,
      {
        body: settingBody,
      },
    );
  typia.assert<ICommunityPlatformPlatformSetting>(setting);

  // 3. Prepare deterministic metadata updates for a platform admin session.
  //    We use the real platform admin id from the join response to more
  //    closely reflect the intended ownership, even though we cannot fetch a
  //    concrete session row from the backend with the given APIs.
  const platformAdminId = authorized.id;
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  const firstIp = "192.0.2.1";
  const firstHref = "https://admin.example.com/dashboard" as string &
    tags.Format<"uri">;
  const firstReferrer = "https://admin.example.com/login" as string &
    tags.Format<"uri">;
  const firstExpiredAt = new Date().toISOString() as string &
    tags.Format<"date-time">;

  const firstUpdateBody: ICommunityPlatformPlatformadminSession.IUpdate = {
    ip: firstIp,
    href: firstHref,
    referrer: firstReferrer,
    expired_at: firstExpiredAt,
  };

  const firstSession: ICommunityPlatformPlatformadminSession =
    await api.functional.communityPlatform.platformAdmin.platformAdmins.sessions.update(
      connection,
      {
        platformAdminId,
        sessionId,
        body: firstUpdateBody,
      },
    );
  typia.assert<ICommunityPlatformPlatformadminSession>(firstSession);

  // 4. Perform a second metadata update with different values to verify that
  //    identity fields are preserved and the latest metadata is reflected.
  const secondIp = "198.51.100.42";
  const secondHref = "https://admin.example.com/security" as string &
    tags.Format<"uri">;
  const secondReferrer = "https://admin.example.com/dashboard" as string &
    tags.Format<"uri">;
  const secondExpiredAt = new Date(
    Date.now() + 60_000,
  ).toISOString() as string & tags.Format<"date-time">; // +1 minute from now

  const secondUpdateBody: ICommunityPlatformPlatformadminSession.IUpdate = {
    ip: secondIp,
    href: secondHref,
    referrer: secondReferrer,
    expired_at: secondExpiredAt,
  };

  const secondSession: ICommunityPlatformPlatformadminSession =
    await api.functional.communityPlatform.platformAdmin.platformAdmins.sessions.update(
      connection,
      {
        platformAdminId,
        sessionId,
        body: secondUpdateBody,
      },
    );
  typia.assert<ICommunityPlatformPlatformadminSession>(secondSession);

  // 5. Business-level invariants between the two updates.
  // Identity fields must remain unchanged across updates.
  TestValidator.equals(
    "platform admin session id remains stable across metadata updates",
    secondSession.id,
    firstSession.id,
  );
  TestValidator.equals(
    "platform admin owner id remains stable across metadata updates",
    secondSession.community_platform_platformadmin_id,
    firstSession.community_platform_platformadmin_id,
  );

  // Latest metadata should reflect the second update.
  TestValidator.equals(
    "session ip reflects latest metadata update",
    secondSession.ip,
    secondIp,
  );
  TestValidator.equals(
    "session href reflects latest metadata update",
    secondSession.href,
    secondHref,
  );
  TestValidator.equals(
    "session referrer reflects latest metadata update",
    secondSession.referrer,
    secondReferrer,
  );
  TestValidator.equals(
    "session expired_at reflects latest metadata update",
    secondSession.expired_at ?? null,
    secondExpiredAt,
  );
}
