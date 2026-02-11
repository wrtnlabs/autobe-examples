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

export async function test_api_feeds_community_access_denied_if_not_subscribed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and login as community owner
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerPassword = RandomGenerator.alphaNumeric(16);
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_community_owner_join(ownerConnection, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
    } satisfies IRedditCommunityCommunityOwner.IJoin,
  });
  await authorize_community_owner_login(ownerConnection, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
    } satisfies IRedditCommunityCommunityOwner.ILogin,
  });
  // 2. Create community as owner
  const communityName = RandomGenerator.alphabets(10);
  const community =
    await generate_random_reddit_community_community_owner_communities_create(
      ownerConnection,
      {
        body: {
          name: communityName,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create and login as member (not subscribed)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditCommunityMember.IJoin,
  });
  await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditCommunityMember.ILogin,
  });
  // 4. Create multiple posts in the community as owner
  const postCount = 5;
  void ArrayUtil.repeat(postCount, async () => {
    await generate_random_reddit_community_member_posts_create(
      ownerConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          communityName: communityName,
          textContent: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
  });
  // 5. Attempt to access community feed as member (not subscribed)
  // Note: member is not subscribed, so should get empty feed
  const feedResponse = await api.functional.redditCommunity.feeds.index(
    memberConnection,
    {
      communityId: community.id,
      body: {
        sortBy: "new",
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(feedResponse);
  // 6. Validate response has empty data array and proper pagination
  TestValidator.equals("data array is empty", feedResponse.data.length, 0);
  TestValidator.equals(
    "pagination current is 1",
    feedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 20",
    feedResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination records is 0",
    feedResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is 0",
    feedResponse.pagination.pages,
    0,
  );
}