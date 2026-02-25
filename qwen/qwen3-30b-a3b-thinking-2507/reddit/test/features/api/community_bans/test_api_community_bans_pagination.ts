import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityBan";
import type { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import type { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import type { IRedditProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_member_communities_create } from "../../../generate/generate_random_reddit_member_communities_create";
import { prepare_random_reddit_community } from "../../../prepare/prepare_random_reddit_community";

export async function test_api_community_bans_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  // 2. Create new member
  const memberJoinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    },
  });
  // 3. Create community
  const community = await generate_random_reddit_member_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 1 }),
      },
    },
  );
  // 4. Retrieve banned users
  const bansResult = await api.functional.reddit.member.communities.bans.index(
    memberConnection,
    {
      communityId: community.id,
      body: {
        page: 1,
        limit: 5,
      },
    },
  );
  typia.assert(bansResult);
  // 5. Validate
  TestValidator.equals("banned user count", bansResult.data.length, 5);
  TestValidator.equals("pagination current", bansResult.pagination.current, 1);
  TestValidator.equals("pagination limit", bansResult.pagination.limit, 5);
  TestValidator.equals("pagination records", bansResult.pagination.records, 5);
  TestValidator.equals("pagination pages", bansResult.pagination.pages, 1);
}
