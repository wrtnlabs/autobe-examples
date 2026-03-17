import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityBan";
import type { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_ban_list_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as member to have authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joinResult);
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: joinResult.token.access },
  };
  // 2. Test date range filtering
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twoHoursAgo = new Date(now.getTime() - 120 * 60 * 1000);
  const threeHoursAgo = new Date(now.getTime() - 180 * 60 * 1000);
  const dateRangeResults =
    await api.functional.redditCommunity.communities.bans.index(
      authenticatedConnection,
      {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          banned_at_from: twoHoursAgo.toISOString(),
          banned_at_to: oneHourAgo.toISOString(),
        },
      },
    );
  typia.assert(dateRangeResults);
  // 3. Test text search filtering
  const textSearchResults =
    await api.functional.redditCommunity.communities.bans.index(
      authenticatedConnection,
      {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          text_search: "test",
        },
      },
    );
  typia.assert(textSearchResults);
  // 4. Test moderator filtering
  const moderatorFilterResults =
    await api.functional.redditCommunity.communities.bans.index(
      authenticatedConnection,
      {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          banned_by_moderator_id: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(moderatorFilterResults);
  // 5. Test pagination
  const paginationResults =
    await api.functional.redditCommunity.communities.bans.index(
      authenticatedConnection,
      {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 2,
          limit: 10,
        },
      },
    );
  typia.assert(paginationResults);
  TestValidator.equals(
    "pagination current page",
    paginationResults.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit",
    paginationResults.pagination.limit,
    10,
  );
  // 6. Test empty results with restrictive filter
  const emptyFilterResults =
    await api.functional.redditCommunity.communities.bans.index(
      authenticatedConnection,
      {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          banned_at_from: threeHoursAgo.toISOString(),
          banned_at_to: twoHoursAgo.toISOString(),
        },
      },
    );
  typia.assert(emptyFilterResults);
  TestValidator.equals(
    "filter results records count",
    emptyFilterResults.pagination.records,
    0,
  );
  TestValidator.equals(
    "filter results data array empty",
    emptyFilterResults.data.length,
    0,
  );
  TestValidator.equals(
    "filter results pages",
    emptyFilterResults.pagination.pages,
    0,
  );
  // 7. Test combined filters
  const combinedResults =
    await api.functional.redditCommunity.communities.bans.index(
      authenticatedConnection,
      {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          banned_at_from: twoHoursAgo.toISOString(),
          banned_at_to: oneHourAgo.toISOString(),
          text_search: "test",
          banned_by_moderator_id: typia.random<string & tags.Format<"uuid">>(),
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(combinedResults);
  TestValidator.equals(
    "combined filter pagination current",
    combinedResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "combined filter pagination limit",
    combinedResults.pagination.limit,
    20,
  );
}
