import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityBan";
import type { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_bans_create } from "../../../generate/generate_random_reddit_community_member_communities_bans_create";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { prepare_random_reddit_community_ban } from "../../../prepare/prepare_random_reddit_community_ban";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

export async function test_api_community_ban_list_retrieval_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerUsername = RandomGenerator.name(1);
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: ownerUsername,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create community
  const communityName = `test_community_${RandomGenerator.alphabets(8)}`;
  const community =
    await generate_random_reddit_community_member_communities_create(
      ownerConnection,
      {
        body: {
          name: communityName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals("community name matches", community.name, communityName);
  // 3. Create second member account (to be banned)
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMemberUsername = RandomGenerator.name(1);
  const bannedMemberAuth = await authorize_member_join(bannedMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: bannedMemberUsername,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(bannedMemberAuth);
  // 4. Owner bans the second member from the community
  const banReason = RandomGenerator.paragraph({ sentences: 1 });
  const ban =
    await generate_random_reddit_community_member_communities_bans_create(
      ownerConnection,
      {
        params: { communityName },
        body: {
          reddit_community_member_id: bannedMemberAuth.id,
          reason: banReason,
        } satisfies IRedditCommunityBan.ICreate,
      },
    );
  typia.assert(ban);
  TestValidator.equals(
    "banned member id matches",
    ban.bannedMember.id,
    bannedMemberAuth.id,
  );
  TestValidator.equals("ban reason matches", ban.reason, banReason);
  TestValidator.equals("banned by is owner", ban.bannedBy.id, ownerAuth.id);
  // 5. Retrieve ban list as community owner
  const banListResponse =
    await api.functional.redditCommunity.member.communities.bans.index(
      ownerConnection,
      {
        communityName,
        body: {
          page: 1,
          limit: 20,
          sort: "created_at_desc",
          status: "active",
        } satisfies IRedditCommunityBan.IRequest,
      },
    );
  typia.assert(banListResponse);
  // 6. Validate pagination metadata
  TestValidator.equals(
    "current page is 1",
    banListResponse.pagination.current,
    1,
  );
  TestValidator.equals("limit is 20", banListResponse.pagination.limit, 20);
  TestValidator.equals(
    "total records is 1",
    banListResponse.pagination.records,
    1,
  );
  TestValidator.equals("total pages is 1", banListResponse.pagination.pages, 1);
  // 7. Validate ban list contains the banned user
  TestValidator.equals("ban list has 1 entry", banListResponse.data.length, 1);
  const bannedEntry = banListResponse.data[0];
  TestValidator.equals(
    "banned member id matches",
    bannedEntry.bannedMember.id,
    bannedMemberAuth.id,
  );
  TestValidator.equals(
    "banned member username matches",
    bannedEntry.bannedMember.username,
    bannedMemberUsername,
  );
  TestValidator.equals(
    "banned by id matches owner",
    bannedEntry.bannedBy.id,
    ownerAuth.id,
  );
  TestValidator.equals("ban reason matches", bannedEntry.reason, banReason);
  TestValidator.predicate(
    "ban has created_at timestamp",
    bannedEntry.created_at !== undefined,
  );
}
