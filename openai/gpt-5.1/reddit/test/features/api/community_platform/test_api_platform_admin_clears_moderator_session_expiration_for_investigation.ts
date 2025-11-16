import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorSession";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";

export async function test_api_platform_admin_clears_moderator_session_expiration_for_investigation(
  connection: api.IConnection,
) {
  // 1. Prepare random IDs for the moderator and its session.
  const communityModeratorId = typia.random<string & tags.Format<"uuid">>();
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // 2. First update: mark the session as expired at a specific time.
  const expiredAtValue = new Date().toISOString();

  const baselineSession: ICommunityPlatformCommunityModeratorSession =
    await api.functional.communityPlatform.platformAdmin.communityModerators.sessions.update(
      connection,
      {
        communityModeratorId,
        sessionId,
        body: {
          expired_at: expiredAtValue,
        } satisfies ICommunityPlatformCommunityModeratorSession.IUpdate,
      },
    );
  typia.assert<ICommunityPlatformCommunityModeratorSession>(baselineSession);

  // Capture immutable / ownership / metadata fields for later comparison.
  const baselineId = baselineSession.id;
  const baselineOwnerId =
    baselineSession.community_platform_communitymoderator_id;
  const baselineIp = baselineSession.ip;
  const baselineHref = baselineSession.href;
  const baselineReferrer = baselineSession.referrer;
  const baselineCreatedAt = baselineSession.created_at;
  const baselineModerator = baselineSession.communityModerator;
  const baselineExpiredAt = baselineSession.expired_at;

  // Sanity check: after the first update, expired_at should be set
  // (in the primary business scenario it represents an already-expired session).
  // We do not enforce non-null at type level because the simulator or
  // implementation may choose to override or ignore our input, but we still
  // check for inequality with the explicit value when possible.
  if (baselineExpiredAt !== null && baselineExpiredAt !== undefined) {
    TestValidator.equals(
      "baseline expired_at should match the explicitly set value when non-null",
      baselineExpiredAt,
      expiredAtValue,
    );
  }

  // 3. Second update: clear the expiration by setting expired_at to null.
  const clearedSession: ICommunityPlatformCommunityModeratorSession =
    await api.functional.communityPlatform.platformAdmin.communityModerators.sessions.update(
      connection,
      {
        communityModeratorId,
        sessionId,
        body: {
          expired_at: null,
        } satisfies ICommunityPlatformCommunityModeratorSession.IUpdate,
      },
    );
  typia.assert<ICommunityPlatformCommunityModeratorSession>(clearedSession);

  // 4. Assert that immutable identifiers and metadata are preserved.
  TestValidator.equals(
    "session id must remain unchanged after clearing expired_at",
    clearedSession.id,
    baselineId,
  );
  TestValidator.equals(
    "session owner (community moderator) must remain unchanged",
    clearedSession.community_platform_communitymoderator_id,
    baselineOwnerId,
  );
  TestValidator.equals(
    "session IP address must remain unchanged",
    clearedSession.ip,
    baselineIp,
  );
  TestValidator.equals(
    "session href must remain unchanged",
    clearedSession.href,
    baselineHref,
  );
  TestValidator.equals(
    "session referrer must remain unchanged",
    clearedSession.referrer,
    baselineReferrer,
  );
  TestValidator.equals(
    "session created_at must remain unchanged",
    clearedSession.created_at,
    baselineCreatedAt,
  );
  TestValidator.equals(
    "embedded communityModerator summary must remain unchanged",
    clearedSession.communityModerator,
    baselineModerator,
  );

  // 5. Assert that expired_at has been cleared to null.
  TestValidator.equals(
    "expired_at must be cleared to null by admin update",
    clearedSession.expired_at,
    null,
  );

  // 6. When the baseline had a non-null expiration, assert that the clearing
  // actually changed the value.
  if (baselineExpiredAt !== null && baselineExpiredAt !== undefined) {
    TestValidator.notEquals(
      "clearing expired_at should change the previous non-null value",
      clearedSession.expired_at,
      baselineExpiredAt,
    );
  }
}
