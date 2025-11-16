import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModeratorSession";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModeratorSession";

/**
 * Test moderator session sorting parameter acceptance and functionality.
 *
 * This test validates that the session index API correctly accepts and
 * processes sort_by and sort_order parameters. While we can only create a
 * single session via the join endpoint (no login endpoint available), we verify
 * that all sorting parameter combinations are accepted and return valid
 * results, ensuring the API is ready for production use when moderators have
 * multiple sessions.
 *
 * Test flow:
 *
 * 1. Create a moderator account (creates initial session)
 * 2. Query sessions with sort_by created_at, sort_order asc
 * 3. Query sessions with sort_by created_at, sort_order desc
 * 4. Query sessions with sort_by ip, sort_order asc
 * 5. Query sessions with sort_by ip, sort_order desc
 * 6. Validate all queries return valid responses with the session
 * 7. Verify pagination and data consistency across all sorting options
 */
export async function test_api_moderator_session_sorting_options(
  connection: api.IConnection,
) {
  // 1. Create moderator account (creates initial session)
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "testPassword123";
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        nickname: RandomGenerator.name(),
        ip: "192.168.1.100",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Query sessions sorted by created_at ascending
  const sortedByDateAsc: IPageIRedditCommunityModeratorSession.ISummary =
    await api.functional.redditCommunity.moderator.moderators.sessions.index(
      connection,
      {
        username: moderator.username,
        body: {
          sort_by: "created_at",
          sort_order: "asc",
        } satisfies IRedditCommunityModeratorSession.IRequest,
      },
    );
  typia.assert(sortedByDateAsc);

  TestValidator.predicate(
    "sort by created_at asc should return at least one session",
    sortedByDateAsc.data.length >= 1,
  );

  // 3. Query sessions sorted by created_at descending
  const sortedByDateDesc: IPageIRedditCommunityModeratorSession.ISummary =
    await api.functional.redditCommunity.moderator.moderators.sessions.index(
      connection,
      {
        username: moderator.username,
        body: {
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IRedditCommunityModeratorSession.IRequest,
      },
    );
  typia.assert(sortedByDateDesc);

  TestValidator.predicate(
    "sort by created_at desc should return at least one session",
    sortedByDateDesc.data.length >= 1,
  );

  // 4. Query sessions sorted by ip ascending
  const sortedByIpAsc: IPageIRedditCommunityModeratorSession.ISummary =
    await api.functional.redditCommunity.moderator.moderators.sessions.index(
      connection,
      {
        username: moderator.username,
        body: {
          sort_by: "ip",
          sort_order: "asc",
        } satisfies IRedditCommunityModeratorSession.IRequest,
      },
    );
  typia.assert(sortedByIpAsc);

  TestValidator.predicate(
    "sort by ip asc should return at least one session",
    sortedByIpAsc.data.length >= 1,
  );

  // 5. Query sessions sorted by ip descending
  const sortedByIpDesc: IPageIRedditCommunityModeratorSession.ISummary =
    await api.functional.redditCommunity.moderator.moderators.sessions.index(
      connection,
      {
        username: moderator.username,
        body: {
          sort_by: "ip",
          sort_order: "desc",
        } satisfies IRedditCommunityModeratorSession.IRequest,
      },
    );
  typia.assert(sortedByIpDesc);

  TestValidator.predicate(
    "sort by ip desc should return at least one session",
    sortedByIpDesc.data.length >= 1,
  );

  // 6. Verify all sorting options return consistent data
  TestValidator.equals(
    "all sorting options should return same total records",
    sortedByDateAsc.pagination.records,
    sortedByDateDesc.pagination.records,
  );
  TestValidator.equals(
    "date asc and ip asc should return same total records",
    sortedByDateAsc.pagination.records,
    sortedByIpAsc.pagination.records,
  );
  TestValidator.equals(
    "date asc and ip desc should return same total records",
    sortedByDateAsc.pagination.records,
    sortedByIpDesc.pagination.records,
  );

  // 7. Verify the session data is consistent
  const sessionId = sortedByDateAsc.data[0].id;
  TestValidator.equals(
    "session should have same id across all sorting options",
    sessionId,
    sortedByDateDesc.data[0].id,
  );
  TestValidator.equals(
    "session should have same id in ip sorted results",
    sessionId,
    sortedByIpAsc.data[0].id,
  );
  TestValidator.equals(
    "session should have same id in ip desc sorted results",
    sessionId,
    sortedByIpDesc.data[0].id,
  );

  // 8. Verify the IP address is correctly returned
  TestValidator.equals(
    "session should return the correct IP address",
    sortedByIpAsc.data[0].ip,
    "192.168.1.100",
  );
}
