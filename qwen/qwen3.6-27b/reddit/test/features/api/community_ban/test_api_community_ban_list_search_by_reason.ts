import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityCommunityBan";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityBan";
import type { IREdditLikeCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityModerator";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_community_bans_create } from "../../../generate/generate_random_reddit_like_community_member_communities_community_bans_create";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_ban } from "../../../prepare/prepare_random_reddit_like_community_community_ban";

/**
 * Test searching community bans by reason filter.
 *
 * Validates that the community bans search endpoint returns only records matching the provided search term
 * while excluding non-matching bans. Tests text matching against ban reason field with pagination support.
 *
 * 1. Authenticate as a member and create a community
 * 2. Create multiple ban records with different reasons
 * 3. Search bans using reason text filter
 * 4. Verify only matching bans are returned
 */
export async function test_api_community_ban_list_search_by_reason(
  connection: api.IConnection,
) {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Create a community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Create another member to ban
  const targetConnection: api.IConnection = { host: connection.host };
  const target = await authorize_member_join(targetConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(target);
  // Create ban records with different reasons
  const banReasons = ["spam posting", "harassment", "offensive language"];
  await ArrayUtil.asyncForEach(banReasons, async (reason) => {
    const ban =
      await generate_random_reddit_like_community_member_communities_community_bans_create(
        memberConnection,
        {
          body: {
            member_id: target.id,
            reason: reason,
          },
          params: { communityId: community.id },
        },
      );
    typia.assert(ban);
  });
  // 4. Search bans using reason text filter
  const searchRequest: IREdditLikeCommunityCommunityBan.IRequest = {
    search: "spam",
  };
  const searchResult =
    await api.functional.redditLikeCommunity.communities.community_bans.index(
      memberConnection,
      {
        communityId: community.id,
        body: searchRequest,
      },
    );
  typia.assert(searchResult);
  // 5. Validate results
  TestValidator.equals(
    "search results contain only matching bans",
    searchResult.data.filter((ban) => ban.reason.includes("spam")).length,
    searchResult.data.length,
  );
  TestValidator.equals(
    "total matching record count",
    searchResult.pagination.records,
    searchResult.data.length,
  );
}
