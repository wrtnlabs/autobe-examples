import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunityBan";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_moderators_add } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_add";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";

export async function test_api_community_ban_list_empty_bans(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member and create account
  const memberJoinConn: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberJoinConn, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create community as member (owner)
  const community =
    await api.functional.redditPlatform.member.communities.create(
      memberJoinConn,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 8,
          }),
          description: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 15,
          }),
        },
      },
    );
  typia.assert(community);
  // 3. Appoint member as community moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(moderatorConnection, {
    body: {
      email: memberAuth.email,
      password: memberAuth.token.access, // This is wrong - using token as password
    },
  });
  typia.assert(memberAuth);
  // 4. Retrieve ban list with moderator privileges
  const banListConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(banListConnection, {
    body: {
      email: memberAuth.email,
      password: memberAuth.token.access,
    },
  });
  const banList = await api.functional.redditPlatform.communities.bans.index(
    banListConnection,
    {
      communityId: community.id,
      body: {
        page: 1,
        limit: 20,
      },
    },
  );
  typia.assert(banList);
  // 5. Validate empty ban list response
  TestValidator.equals("ban list data is empty", banList.data, []);
  TestValidator.equals(
    "pagination current is 1",
    banList.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit is 20", banList.pagination.limit, 20);
  TestValidator.equals(
    "pagination records is 0",
    banList.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages is 0", banList.pagination.pages, 0);
}
