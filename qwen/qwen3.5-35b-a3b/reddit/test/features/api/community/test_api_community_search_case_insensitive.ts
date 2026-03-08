import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunity";
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
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";

export async function test_api_community_search_case_insensitive(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
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
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create test communities with different name patterns
  const community1 =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: "TechDiscussion",
          description: "Discussion about technology topics",
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community1);
  const community2 =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: "COOKING_TIPS",
          description: "Tips and tricks for cooking",
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community2);
  const community3 =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: "SportsNews",
          description: "Latest sports news and updates",
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community3);
  // 3. Test case-insensitive search with 'tech' (should match 'TechDiscussion')
  const search1 = await api.functional.redditPlatform.communities.index(
    memberConnection,
    {
      body: {
        name: "tech",
      } satisfies IRedditPlatformCommunity.IRequest,
    },
  );
  typia.assert(search1);
  const techCommunities = search1.data.filter((c) =>
    c.name.toLowerCase().includes("tech"),
  );
  TestValidator.equals(
    "tech search returns TechDiscussion",
    techCommunities.length,
    1,
  );
  TestValidator.equals(
    "tech search community name matches",
    techCommunities[0].name,
    "TechDiscussion",
  );
  // 4. Test case-insensitive search with 'COOKING' (should match 'COOKING_TIPS')
  const search2 = await api.functional.redditPlatform.communities.index(
    memberConnection,
    {
      body: {
        name: "COOKING",
      } satisfies IRedditPlatformCommunity.IRequest,
    },
  );
  typia.assert(search2);
  const cookingCommunities = search2.data.filter((c) =>
    c.name.toLowerCase().includes("cooking"),
  );
  TestValidator.equals(
    "cooking search returns COOKING_TIPS",
    cookingCommunities.length,
    1,
  );
  TestValidator.equals(
    "cooking search community name matches",
    cookingCommunities[0].name,
    "COOKING_TIPS",
  );
  // 5. Test case-insensitive search with 'sp' (should match 'SportsNews')
  const search3 = await api.functional.redditPlatform.communities.index(
    memberConnection,
    {
      body: {
        name: "sp",
      } satisfies IRedditPlatformCommunity.IRequest,
    },
  );
  typia.assert(search3);
  const sportsCommunities = search3.data.filter((c) =>
    c.name.toLowerCase().includes("sp"),
  );
  TestValidator.equals(
    "sp search returns SportsNews",
    sportsCommunities.length,
    1,
  );
  TestValidator.equals(
    "sp search community name matches",
    sportsCommunities[0].name,
    "SportsNews",
  );
  // 6. Test non-existent search (should return empty results)
  const search4 = await api.functional.redditPlatform.communities.index(
    memberConnection,
    {
      body: {
        name: "nonexistent123",
      } satisfies IRedditPlatformCommunity.IRequest,
    },
  );
  typia.assert(search4);
  TestValidator.equals(
    "nonexistent search returns empty data",
    search4.data.length,
    0,
  );
  TestValidator.equals(
    "nonexistent search pagination records",
    search4.pagination.records,
    0,
  );
}
