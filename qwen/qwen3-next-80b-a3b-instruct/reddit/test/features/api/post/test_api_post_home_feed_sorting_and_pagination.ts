import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_community_owner_communities_create } from "../../../generate/generate_random_reddit_community_community_owner_communities_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_post_home_feed_sorting_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create community owner and member actors
  const ownerConnection: api.IConnection = {
    host: connection.host,
    headers: {},
  };
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerPassword = RandomGenerator.alphaNumeric(16);
  const ownerResponse: IRedditCommunityCommunityOwner.IAuthorized =
    await authorize_community_owner_join(ownerConnection, {
      body: {
        email: ownerEmail,
        password: ownerPassword,
      } satisfies IRedditCommunityCommunityOwner.IJoin,
    });
  ownerConnection.headers = ownerConnection.headers || {};
  ownerConnection.headers.Authorization = ownerResponse.token.access;
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {},
  };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberResponse: IRedditCommunityMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IRedditCommunityMember.IJoin,
    });
  memberConnection.headers = memberConnection.headers || {};
  memberConnection.headers.Authorization = memberResponse.token.access;
  // 1. Create 3 communities owned by community owner
  const community1: IRedditCommunityCommunity =
    await generate_random_reddit_community_community_owner_communities_create(
      ownerConnection,
      {
        body: {
          name: `community-${RandomGenerator.alphabets(5)}`,
          description: null,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  const community2: IRedditCommunityCommunity =
    await generate_random_reddit_community_community_owner_communities_create(
      ownerConnection,
      {
        body: {
          name: `community-${RandomGenerator.alphabets(5)}`,
          description: null,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  const community3: IRedditCommunityCommunity =
    await generate_random_reddit_community_community_owner_communities_create(
      ownerConnection,
      {
        body: {
          name: `community-${RandomGenerator.alphabets(5)}`,
          description: null,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  // 2. Create 5 posts in these communities as member (member can post to any public community)
  const now = new Date();
  const post1: IRedditCommunityPost =
    await generate_random_reddit_community_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.name(3),
          communityName: community1.name,
          textContent: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
  const post2: IRedditCommunityPost =
    await generate_random_reddit_community_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.name(3),
          communityName: community2.name,
          textContent: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
  const post3: IRedditCommunityPost =
    await generate_random_reddit_community_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.name(3),
          communityName: community3.name,
          textContent: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
  const post4: IRedditCommunityPost =
    await generate_random_reddit_community_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.name(3),
          communityName: community1.name,
          textContent: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
  const post5: IRedditCommunityPost =
    await generate_random_reddit_community_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.name(3),
          communityName: community2.name,
          textContent: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
  // 3. Test each sort option with timeFilter=week and page=2, limit=3
  const sortOptions: ("hot" | "new" | "top" | "controversial")[] = [
    "hot",
    "new",
    "top",
    "controversial",
  ];
  for (const sortBy of sortOptions) {
    const request: IRedditCommunityPost.IRequest = {
      feedType: "home",
      sortBy,
      timeFilter: sortBy === "top" ? "week" : undefined, // timeFilter only applies to 'top'
      page: 2,
      limit: 3,
    };
    const result: IPageIRedditCommunityPost.ISummary =
      await api.functional.redditCommunity.member.home.index(memberConnection, {
        body: request,
      });
    typia.assert(result);
    // Verify pagination structure
    TestValidator.equals(
      "pagination current equals page",
      result.pagination.current,
      2,
    );
    TestValidator.equals(
      "pagination limit equals limit",
      result.pagination.limit,
      3,
    );
    TestValidator.predicate(
      "pagination records >= 0",
      result.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages >= 1",
      result.pagination.pages >= 1,
    );
    // Verify data array items
    TestValidator.equals(
      "data array length matches limit",
      result.data.length,
      3,
    );
    // Verify all items follow IRedditCommunityPost.ISummary (typing only, no manual validation)
    for (const item of result.data) {
      // typia.assert already validates full structure, including UUID, date-time, etc.
    }
  }
}
