import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_community_report_queue(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator and authorize
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(16),
      bio: RandomGenerator.paragraph({ sentences: 2 }) ?? null,
      avatar_url: RandomGenerator.pick([
        "https://example.com/avatar.png",
        null,
      ]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeModerator.IJoin,
  });
  typia.assert(moderator);
  // 2. Test report queue retrieval with valid community name
  const communityName = `test-community-${RandomGenerator.alphaNumeric(8)}`;
  const reports =
    await api.functional.redditLike.moderator.communities.reports.patchByCommunityname(
      moderatorConnection,
      {
        communityName,
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditLikeReport.IRequest,
      },
    );
  typia.assert(reports);
  TestValidator.predicate(
    "has valid pagination structure",
    reports.pagination.current >= 0 &&
      reports.pagination.limit > 0 &&
      reports.pagination.records >= 0 &&
      reports.pagination.pages >= 0,
  );
  TestValidator.predicate("data is array", Array.isArray(reports.data));
  // 3. Test filtering by status (pending)
  const pendingReports =
    await api.functional.redditLike.moderator.communities.reports.patchByCommunityname(
      moderatorConnection,
      {
        communityName,
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IRedditLikeReport.IRequest,
      },
    );
  typia.assert(pendingReports);
  // 4. Test pagination with different page sizes
  const limitedReports =
    await api.functional.redditLike.moderator.communities.reports.patchByCommunityname(
      moderatorConnection,
      {
        communityName,
        body: {
          page: 1,
          limit: 2,
        } satisfies IRedditLikeReport.IRequest,
      },
    );
  typia.assert(limitedReports);
  TestValidator.predicate(
    "respects limit parameter",
    limitedReports.data.length <= 2,
  );
  // 5. Test sorting by creation time (descending)
  const sortedReports =
    await api.functional.redditLike.moderator.communities.reports.patchByCommunityname(
      moderatorConnection,
      {
        communityName,
        body: {
          sort: "created_at_desc",
          page: 1,
          limit: 10,
        } satisfies IRedditLikeReport.IRequest,
      },
    );
  typia.assert(sortedReports);
  // 6. Test search functionality
  const searchReports =
    await api.functional.redditLike.moderator.communities.reports.patchByCommunityname(
      moderatorConnection,
      {
        communityName,
        body: {
          search: "spam",
          page: 1,
          limit: 10,
        } satisfies IRedditLikeReport.IRequest,
      },
    );
  typia.assert(searchReports);
  // 7. Test error scenario - non-existent community
  await TestValidator.error("non-existent community throws error", async () => {
    await api.functional.redditLike.moderator.communities.reports.patchByCommunityname(
      moderatorConnection,
      {
        communityName: "non-existent-community-xyz",
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditLikeReport.IRequest,
      },
    );
  });
}
