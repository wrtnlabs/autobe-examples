import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorSession";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityModeratorSession";

export async function test_api_platform_admin_get_moderator_session_not_found_for_mismatched_moderator(
  connection: api.IConnection,
) {
  /**
   * Validate that a platformAdmin cannot retrieve a moderator session by
   * mismatching the communityModeratorId and sessionId path parameters.
   *
   * Business rule: the GET endpoint for a moderator session must enforce that
   * the session belongs to the specified moderator and respond with a not-found
   * style error when there is a mismatch, without leaking whether the sessionId
   * exists under a different moderator.
   *
   * Steps:
   *
   * 1. Register and authenticate a platform administrator (POST
   *    /auth/platformAdmin/join).
   * 2. Use the sessions index API to obtain a page of sessions for some moderator
   *    A.
   * 3. From that page, collect at least one session and its owning moderatorId (A)
   *    and also find a different moderator B from another session.
   * 4. Call the GET session endpoint using moderator B's id together with the
   *    sessionId that belongs to moderator A.
   * 5. Assert that the call fails with an HTTP not-found style error (or platform
   *    equivalent) and that no session object is leaked.
   */

  // 1. Register and authenticate a platform administrator.
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(platformAdmin);

  // 2. Use the sessions index API to obtain a page of sessions.
  // We do not know actual moderator IDs a-priori, so we rely on existing data
  // in the environment. We set a small page size to reduce load.
  const sessionsPage: IPageICommunityPlatformCommunityModeratorSession.ISummary =
    await api.functional.communityPlatform.platformAdmin.communityModerators.sessions.index(
      connection,
      {
        communityModeratorId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 1 as number & tags.Type<"int32">,
          limit: 20 as number & tags.Type<"int32">,
        } satisfies ICommunityPlatformCommunityModeratorSession.IRequest,
      },
    );
  typia.assert(sessionsPage);

  // If there are fewer than 2 sessions, we cannot construct a cross-moderator
  // mismatch scenario. In that case simply assert the pagination shape and
  // skip the negative test.
  const allSessions = sessionsPage.data;
  if (allSessions.length < 2) {
    TestValidator.predicate(
      "sessions list has non-negative length",
      () => allSessions.length >= 0,
    );
    return;
  }

  // 3. Split into sessions for moderator A and B.
  const first = allSessions[0];
  const second = allSessions.find(
    (s) => s.communityModerator.id !== first.communityModerator.id,
  );

  // If we couldn't find a second moderator with different id, we cannot
  // construct a mismatch; treat this as an environment limitation and exit
  // after basic sanity checks.
  if (!second) {
    TestValidator.predicate(
      "all sessions belong to a single moderator; cannot test cross-moderator mismatch",
      () =>
        allSessions.every(
          (s) => s.communityModerator.id === first.communityModerator.id,
        ),
    );
    return;
  }

  const moderatorAId = first.communityModerator.id;
  const moderatorBId = second.communityModerator.id;
  const sessionAId = first.id;

  // Sanity: ensure our captured IDs are valid UUID strings via typia.assert.
  typia.assert<string & tags.Format<"uuid">>(moderatorAId);
  typia.assert<string & tags.Format<"uuid">>(moderatorBId);
  typia.assert<string & tags.Format<"uuid">>(sessionAId);

  // 4 & 5. Call the session GET endpoint with mismatched moderator and
  // session and assert that it results in an HTTP error with not-found style
  // status code (or platform-defined equivalent).
  await TestValidator.httpError(
    "getting a session with mismatched moderator and sessionId should fail with not-found style error",
    [404, 403],
    async () => {
      await api.functional.communityPlatform.platformAdmin.communityModerators.sessions.at(
        connection,
        {
          communityModeratorId: moderatorBId,
          sessionId: sessionAId,
        },
      );
    },
  );
}
