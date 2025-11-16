import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunityModeratorSession";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModeratorSession";

export async function test_api_reddit_community_retrieve_community_moderator_sessions(
  connection: api.IConnection,
) {
  // 1. Admin joins via auth
  // 2. Create community moderator
  // 3. Query moderator sessions list with paging and filtering
  // 4. Validate results

  // Admin register
  const adminJoinBody = {
    email: `admin_${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "adminPass123",
  } satisfies IRedditCommunityAdmin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuthorized);

  // Create community moderator
  const moderatorBody = {
    email: `moderator_${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "modPass123",
    nickname: RandomGenerator.name(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator =
    await api.functional.redditCommunity.admin.redditCommunity.communityModerators.create(
      connection,
      { body: moderatorBody },
    );
  typia.assert(moderator);

  // Prepare requests for session listing
  const sessionRequest1 = {
    page: 1,
    limit: 20,
  } satisfies IRedditCommunityCommunityModeratorSession.IRequest;

  // Query sessions without filters
  const sessionPage1 =
    await api.functional.redditCommunity.admin.redditCommunity.communityModerators.communityModeratorSessions.index(
      connection,
      { id: moderator.id, body: sessionRequest1 },
    );
  typia.assert(sessionPage1);

  // Validate pagination
  TestValidator.equals(
    "pagination current page equals 1",
    sessionPage1.pagination.current,
    1,
  );
  TestValidator.predicate(
    "session data length is less or equal to limit",
    sessionPage1.data.length <= sessionRequest1.limit,
  );

  // If sessions exist, validate property consistency
  if (sessionPage1.data.length > 0) {
    for (const session of sessionPage1.data) {
      typia.assert(session);
      TestValidator.equals(
        "session moderator id matches",
        session.reddit_community_community_moderator_id,
        moderator.id,
      );
    }
  }

  // Query sessions with filter IP if data exists
  if (sessionPage1.data.length > 0) {
    const firstSessionIp = sessionPage1.data[0].ip;

    const sessionRequest2 = {
      page: 1,
      limit: 10,
      filter: { ip: firstSessionIp },
    } satisfies IRedditCommunityCommunityModeratorSession.IRequest;

    const sessionPage2 =
      await api.functional.redditCommunity.admin.redditCommunity.communityModerators.communityModeratorSessions.index(
        connection,
        { id: moderator.id, body: sessionRequest2 },
      );
    typia.assert(sessionPage2);

    // All returned sessions should have the filtered ip
    for (const session of sessionPage2.data) {
      TestValidator.equals(
        "session ip matches filter",
        session.ip,
        firstSessionIp,
      );
    }
  }
}
