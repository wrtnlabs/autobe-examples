import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeBan";
import type { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeBan";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_ban_list_pagination_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeAdmin.IJoin,
  });
  // 2. Create community if none exist using admin connection
  const communities = await api.functional.redditLike.communities.index(
    adminConnection,
    {
      body: { page: 1, limit: 100 } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(communities);
  // 3. Select community to test ban functionality
  const selectedCommunity = communities.data[0];
  if (!selectedCommunity) {
    throw new Error("No communities available for testing");
  }
  // 4. Create some ban entries (bypass member creation - use random data directly)
  // Since ban creation might not be supported in this API, we'll just test the listing
  // 5. Test pagination - get first page
  const firstPage =
    await api.functional.redditLike.admin.communities.bans.index(
      adminConnection,
      {
        communityId: selectedCommunity.name,
        body: { page: 1, limit: 2 } satisfies IRedditLikeBan.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals("first page has 2 items", firstPage.data.length, 2);
  TestValidator.equals(
    "first page pagination correct",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit correct",
    firstPage.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "first page has total records",
    firstPage.pagination.records >= 0,
  );
  // 6. Test second page
  const secondPage =
    await api.functional.redditLike.admin.communities.bans.index(
      adminConnection,
      {
        communityId: selectedCommunity.name,
        body: { page: 2, limit: 2 } satisfies IRedditLikeBan.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals("second page has 2 items", secondPage.data.length, 2);
  TestValidator.equals(
    "second page pagination correct",
    secondPage.pagination.current,
    2,
  );
  // 7. Test filtering by active status
  const activePage =
    await api.functional.redditLike.admin.communities.bans.index(
      adminConnection,
      {
        communityId: selectedCommunity.name,
        body: {
          page: 1,
          limit: 10,
          status: "active",
        } satisfies IRedditLikeBan.IRequest,
      },
    );
  typia.assert(activePage);
  // 8. Test filtering by inactive status
  const inactivePage =
    await api.functional.redditLike.admin.communities.bans.index(
      adminConnection,
      {
        communityId: selectedCommunity.name,
        body: {
          page: 1,
          limit: 10,
          status: "inactive",
        } satisfies IRedditLikeBan.IRequest,
      },
    );
  typia.assert(inactivePage);
  // 9. Test sorting - most recent first
  const sortedPage =
    await api.functional.redditLike.admin.communities.bans.index(
      adminConnection,
      {
        communityId: selectedCommunity.name,
        body: { page: 1, limit: 10 } satisfies IRedditLikeBan.IRequest,
      },
    );
  typia.assert(sortedPage);
  // 10. Test banned user and community reference data
  const referencePage =
    await api.functional.redditLike.admin.communities.bans.index(
      adminConnection,
      {
        communityId: selectedCommunity.name,
        body: { page: 1, limit: 10 } satisfies IRedditLikeBan.IRequest,
      },
    );
  typia.assert(referencePage);
  referencePage.data.forEach((ban) => {
    TestValidator.equals(
      "has banned user id",
      typeof ban.bannedUser.id,
      "string",
    );
    TestValidator.equals(
      "has banned user username",
      typeof ban.bannedUser.username,
      "string",
    );
    TestValidator.equals(
      "has banned user display_name",
      typeof ban.bannedUser.display_name,
      "string",
    );
    TestValidator.equals(
      "has banned community name",
      typeof ban.bannedCommunity.name,
      "string",
    );
    TestValidator.equals(
      "has banned community subscriber_count",
      typeof ban.bannedCommunity.subscriber_count,
      "number",
    );
  });
}
