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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityModeratorSession";

/**
 * Happy-path: platform admin fetches detailed information for a specific
 * community moderator session and checks consistency with the session summary
 * listing.
 *
 * Business flow (constrained to available APIs):
 *
 * 1. Register a platform administrator via /auth/platformAdmin/join (this also
 *    authenticates and sets the Authorization header through the SDK).
 * 2. Login again as the same admin via /auth/platformAdmin/login to exercise the
 *    login flow; the last call still leaves us authenticated as platformAdmin.
 * 3. Use the sessions index endpoint PATCH
 *    /communityPlatform/platformAdmin/communityModerators/{communityModeratorId}/sessions
 *    to load a page of moderator session summaries for some moderator.
 *
 *    - Because there is no API to create moderators or their sessions here, this
 *         test assumes such data already exists (fixtures or random data from
 *         simulator). If none exist, the predicate assertion will fail,
 *         signalling missing fixtures.
 * 4. Pick the first session summary from the page and retrieve detailed
 *    information via GET
 *    /communityPlatform/platformAdmin/communityModerators/{communityModeratorId}/sessions/{sessionId}.
 * 5. Validate:
 *
 *    - Typia.assert on both index and detail responses.
 *    - The detail id equals the chosen summary id.
 *    - The detail community_platform_communitymoderator_id equals the nested
 *         moderator id and the summary.communityModerator.id.
 *    - Ip, href, referrer, created_at are consistent between summary and detail.
 *    - Expired_at matches between summary and detail (both null/undefined or equal
 *         timestamps).
 */
export async function test_api_platform_admin_get_moderator_session_detail_happy_path(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin (join)
  const joinedAdmin = await api.functional.auth.platformAdmin.join(connection, {
    body: {
      username: RandomGenerator.alphabets(12),
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd!", // simple deterministic password for re-login
      displayName: RandomGenerator.name(),
      // ip is optional; simple fixed value is fine
      ip: "203.0.113.10",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformPlatformadmin.IJoin,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(joinedAdmin);

  // 2. Login again as platform admin to ensure login flow works and token is set
  const loggedInAdmin = await api.functional.auth.platformAdmin.login(
    connection,
    {
      body: {
        identifier: joinedAdmin.username,
        password: "P@ssw0rd!",
        ip: "203.0.113.10",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(loggedInAdmin);

  // 3. List moderator sessions for some moderator.
  // NOTE: With given SDK, we do not have an API to create a community moderator
  // or sessions. We rely on existing seeded data or simulator random data.
  // Use a deterministic moderatorId pattern so that real fixtures can align.
  const communityModeratorId: string = "11111111-1111-1111-1111-111111111111";

  const pageRequest = {
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformCommunityModeratorSession.IRequest;

  const page: IPageICommunityPlatformCommunityModeratorSession.ISummary =
    await api.functional.communityPlatform.platformAdmin.communityModerators.sessions.index(
      connection,
      {
        communityModeratorId,
        body: pageRequest,
      },
    );
  typia.assert<IPageICommunityPlatformCommunityModeratorSession.ISummary>(page);

  // Ensure we have at least one session in the page.
  TestValidator.predicate(
    "moderator sessions index should return at least one session",
    page.pagination.records > 0 && page.data.length > 0,
  );

  const summary: ICommunityPlatformCommunityModeratorSession.ISummary =
    page.data[0];

  // 4. Fetch detailed session information using GET /sessions/{sessionId}
  const detail: ICommunityPlatformCommunityModeratorSession =
    await api.functional.communityPlatform.platformAdmin.communityModerators.sessions.at(
      connection,
      {
        communityModeratorId: summary.communityModerator.id,
        sessionId: summary.id,
      },
    );
  typia.assert<ICommunityPlatformCommunityModeratorSession>(detail);

  // 5. Validate core identity and consistency between summary and detail
  TestValidator.equals(
    "detail.id must equal summary.id",
    detail.id,
    summary.id,
  );

  TestValidator.equals(
    "detail.community_platform_communitymoderator_id matches nested moderator id",
    detail.community_platform_communitymoderator_id,
    detail.communityModerator.id,
  );

  TestValidator.equals(
    "detail.community_platform_communitymoderator_id equals summary.communityModerator.id",
    detail.community_platform_communitymoderator_id,
    summary.communityModerator.id,
  );

  TestValidator.equals("ip in detail equals summary.ip", detail.ip, summary.ip);

  TestValidator.equals(
    "href in detail equals summary.href",
    detail.href,
    summary.href,
  );

  TestValidator.equals(
    "referrer in detail equals summary.referrer",
    detail.referrer,
    summary.referrer,
  );

  TestValidator.equals(
    "created_at in detail equals summary.created_at",
    detail.created_at,
    summary.created_at,
  );

  TestValidator.equals(
    "expired_at in detail equals summary.expired_at",
    detail.expired_at ?? null,
    summary.expired_at ?? null,
  );
}
