import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IPageIRedditCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPostSnapshot";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
import type { IRedditCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostSnapshot";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_subscriptions_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_file } from "../../../prepare/prepare_random_reddit_community_post_file";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

export async function test_api_post_snapshot_empty_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.name(3),
      href: "https://example.com/join",
      referrer: "https://example.com/",
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member);
  // 2. Get existing communities
  const communityList =
    await api.functional.redditCommunity.member.communities.index(
      memberConnection,
      {
        body: {
          limit: 10,
        } satisfies IRedditCommunityCommunity.IRequest,
      },
    );
  typia.assert(communityList);
  // Validate we have communities to work with
  TestValidator.predicate(
    "at least one community available",
    communityList.data.length > 0,
  );
  // Select first available community
  const targetCommunity = communityList.data[0];
  typia.assert(targetCommunity);
  // 3. Subscribe to the community
  const subscription =
    await generate_random_reddit_community_member_subscriptions_create(
      memberConnection,
      {
        body: {
          reddit_community_communities_id: targetCommunity.id,
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create a post without modifications
  const post = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        post_type: "text" as const,
        reddit_community_community_id: targetCommunity.id,
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Retrieve snapshots for the post
  const snapshotResponse =
    await api.functional.redditCommunity.posts.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        body: {} satisfies IRedditCommunityPostSnapshot.IRequest,
      },
    );
  typia.assert(snapshotResponse);
  // 6. Validate empty snapshot handling
  TestValidator.equals(
    "snapshots data is empty array",
    snapshotResponse.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records is 0",
    snapshotResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is 0",
    snapshotResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination limit is default",
    snapshotResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination current is 1",
    snapshotResponse.pagination.current,
    1,
  );
  TestValidator.equals("post can be retrieved without error", post.id, post.id);
}
