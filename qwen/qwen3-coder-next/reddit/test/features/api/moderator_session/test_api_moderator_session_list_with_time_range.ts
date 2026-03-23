import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeMemberSession";
import type { IRedditLikeGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuestSession";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberSession";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_session_list_with_time_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
    } satisfies IRedditLikeModerator.IJoin,
  });
  // 2. Create test sessions with known timestamps
  // First session: 2 hours ago
  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000);
  // Create a session that should be filtered out (too old)
  const oldSession = await api.functional.redditLike.moderator.sessions.index(
    moderatorConnection,
    {
      body: {
        createdAtStart: twoHoursAgo.toISOString(),
        createdAtEnd: twoHoursAgo.toISOString(),
        page: 1,
        limit: 1,
      } satisfies IRedditLikeGuestSession.IRequest,
    },
  );
  // Create a session that should be included in results
  const recentSession =
    await api.functional.redditLike.moderator.sessions.index(
      moderatorConnection,
      {
        body: {
          createdAtStart: oneHourAgo.toISOString(),
          createdAtEnd: oneHourAgo.toISOString(),
          page: 1,
          limit: 1,
        } satisfies IRedditLikeGuestSession.IRequest,
      },
    );
  // 3. Test time range filtering - search for sessions within 1 hour ago to now
  const result = await api.functional.redditLike.moderator.sessions.index(
    moderatorConnection,
    {
      body: {
        createdAtStart: oneHourAgo.toISOString(),
        createdAtEnd: now.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IRedditLikeGuestSession.IRequest,
    },
  );
  // 4. Validate results
  typia.assert(result);
  // Verify pagination metadata
  TestValidator.equals(
    "pagination has correct current page",
    result.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination has positive records",
    result.pagination.records >= 1,
  );
  // Verify that returned sessions match time range criteria
  if (result.data.length > 0) {
    result.data.forEach((session) => {
      const sessionDate = new Date(session.created_at);
      TestValidator.predicate(
        "session within time range",
        sessionDate >= oneHourAgo && sessionDate <= now,
      );
    });
  }
  // 5. Test with broader time range (should include more sessions)
  const broadResult = await api.functional.redditLike.moderator.sessions.index(
    moderatorConnection,
    {
      body: {
        createdAtStart: twoHoursAgo.toISOString(),
        createdAtEnd: now.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IRedditLikeGuestSession.IRequest,
    },
  );
  typia.assert(broadResult);
  TestValidator.predicate(
    "broad range has equal or more results",
    broadResult.pagination.records >= result.pagination.records,
  );
}
