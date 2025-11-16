import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministratorSession";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_administrator_session_revocation_single_device(
  connection: api.IConnection,
) {
  // Create administrator account to establish authenticated context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(10),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: "192.168.1.1",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);
  TestValidator.predicate(
    "administrator account created successfully with valid token",
    administrator.token.access.length > 0,
  );

  // Revoke a session with valid UUID format
  const sessionIdToRevoke = typia.random<string & tags.Format<"uuid">>();
  const revokedSession =
    await api.functional.communityPlatform.administrator.auth.administrator.sessions.erase(
      connection,
      {
        sessionId: sessionIdToRevoke,
      },
    );
  typia.assert(revokedSession);

  // Verify revoked session response contains all required fields
  TestValidator.predicate(
    "revoked session has valid UUID ID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      revokedSession.id,
    ),
  );

  TestValidator.predicate(
    "revoked session has administrator reference ID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      revokedSession.community_platform_administrator_id,
    ),
  );

  TestValidator.predicate(
    "revoked session contains IP address",
    revokedSession.ip.length > 0,
  );

  TestValidator.predicate(
    "revoked session contains href URL",
    revokedSession.href.length > 0,
  );

  TestValidator.predicate(
    "revoked session contains referrer URL",
    revokedSession.referrer.length > 0,
  );

  TestValidator.predicate(
    "revoked session has created_at timestamp in ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/i.test(
      revokedSession.created_at,
    ),
  );

  // Verify expired_at is set indicating session revocation
  TestValidator.predicate(
    "revoked session has expired_at timestamp indicating termination",
    revokedSession.expired_at !== null &&
      revokedSession.expired_at !== undefined,
  );

  if (
    revokedSession.expired_at !== null &&
    revokedSession.expired_at !== undefined
  ) {
    TestValidator.predicate(
      "expired_at timestamp is in valid ISO format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/i.test(
        revokedSession.expired_at,
      ),
    );
  }

  // Test idempotency: revoke same session again should succeed
  const revokedSessionAgain =
    await api.functional.communityPlatform.administrator.auth.administrator.sessions.erase(
      connection,
      {
        sessionId: sessionIdToRevoke,
      },
    );
  typia.assert(revokedSessionAgain);

  // Verify idempotent revocation also has expired_at set
  TestValidator.predicate(
    "idempotent revocation succeeds with expired_at timestamp",
    revokedSessionAgain.expired_at !== null &&
      revokedSessionAgain.expired_at !== undefined,
  );

  TestValidator.equals(
    "idempotent revocation returns same session ID",
    revokedSessionAgain.id,
    sessionIdToRevoke,
  );
}
