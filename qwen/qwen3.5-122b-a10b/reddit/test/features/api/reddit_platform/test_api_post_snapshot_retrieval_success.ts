import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_post_snapshot_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: typia.assert<IRedditPlatformMember.IJoin>({
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    }),
  });
  typia.assert(memberAuth);
  // 2. Create community
  const community =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await api.functional.redditPlatform.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 4. Create a text post
  const post = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Generate valid snapshot data for testing
  // Note: Since no snapshot creation API is available, we test the retrieval endpoint
  // with a randomly generated valid snapshot structure
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 6. Retrieve post snapshot (simulation mode will return valid random data)
  const snapshot = await api.functional.redditPlatform.posts.snapshots.at(
    memberConnection,
    {
      postId: post.id,
      snapshotId: snapshotId,
    },
  );
  typia.assert(snapshot);
  // 7. Validate snapshot structure and types
  TestValidator.predicate("snapshot has valid id", snapshot.id !== null);
  TestValidator.predicate("snapshot has postId", snapshot.postId !== null);
  TestValidator.predicate("snapshot has authorId", snapshot.authorId !== null);
  TestValidator.predicate(
    "snapshot has communityId",
    snapshot.communityId !== null,
  );
  TestValidator.predicate("snapshot has title", snapshot.title !== null);
  TestValidator.predicate("snapshot has postType", snapshot.postType !== null);
  TestValidator.predicate(
    "snapshot has voteScore",
    snapshot.voteScore !== null,
  );
  TestValidator.predicate(
    "snapshot has commentCount",
    snapshot.commentCount !== null,
  );
  TestValidator.predicate(
    "snapshot has createdAt",
    snapshot.createdAt !== null,
  );
  TestValidator.predicate("snapshot has author", snapshot.author !== null);
  TestValidator.predicate(
    "snapshot has community",
    snapshot.community !== null,
  );
  TestValidator.predicate("snapshot has post", snapshot.post !== null);
  // 8. Validate snapshot author structure
  TestValidator.predicate(
    "snapshot author has id",
    snapshot.author.id !== null,
  );
  TestValidator.predicate(
    "snapshot author has username",
    snapshot.author.username !== null,
  );
  TestValidator.predicate(
    "snapshot author has karmaScore",
    snapshot.author.karma_score !== null,
  );
  // 9. Validate snapshot community structure
  TestValidator.predicate(
    "snapshot community has id",
    snapshot.community.id !== null,
  );
  TestValidator.predicate(
    "snapshot community has name",
    snapshot.community.name !== null,
  );
  TestValidator.predicate(
    "snapshot community has subscriberCount",
    snapshot.community.subscriber_count !== null,
  );
  // 10. Validate snapshot post reference structure
  TestValidator.predicate("snapshot post has id", snapshot.post.id !== null);
  TestValidator.predicate(
    "snapshot post has title",
    snapshot.post.title !== null,
  );
  TestValidator.predicate(
    "snapshot post has voteScore",
    snapshot.post.vote_score !== null,
  );
  TestValidator.predicate(
    "snapshot post has commentCount",
    snapshot.post.comment_count !== null,
  );
}