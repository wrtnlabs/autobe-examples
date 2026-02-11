import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBannedUser";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBannedUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_community_ban_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
    } satisfies ICommunityMember.IJoin,
  });
  // 2. Create community (as the owner)
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_url: "https://example.com/icon.png",
      },
    },
  );
  // 3. Retrieve the ban list for the community
  const page = await api.functional.community.member.communities.bans.index(
    memberConnection,
    {
      communityId: community.id,
      body: {
        reason: "test reason",
      } satisfies ICommunityBannedUser.IRequest,
    },
  );
  typia.assert(page);
  // 4. Validate the response
  TestValidator.equals("pagination current page", page.pagination.current, 1);
  TestValidator.equals("pagination limit", page.pagination.limit, 20);
  TestValidator.equals("no banned users", page.data.length, 0);
}