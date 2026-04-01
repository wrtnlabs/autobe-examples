import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
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
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

export async function test_api_post_snapshot_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberUsername = RandomGenerator.name(1);
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: memberUsername,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Create a community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      memberConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 4. Create a text post (auto-generates initial snapshot)
  const postTitle = RandomGenerator.paragraph({ sentences: 1 });
  const postContent = RandomGenerator.content({ paragraphs: 2 });
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: postTitle,
        post_type: "text" as const,
        text_content: postContent,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Retrieve the snapshot using post ID
  // Initial snapshot is auto-generated on post creation
  const snapshot =
    await api.functional.redditCommunity.member.posts.snapshots.at(
      memberConnection,
      {
        postId: post.id,
        snapshotId: post.id,
      },
    );
  typia.assert(snapshot);
  // 6. Validate snapshot contents
  TestValidator.equals(
    "snapshot title matches post",
    snapshot.title,
    postTitle,
  );
  TestValidator.equals(
    "snapshot post_type is text",
    snapshot.post_type,
    "text",
  );
  TestValidator.equals(
    "snapshot text_content matches",
    snapshot.text_content,
    postContent,
  );
  TestValidator.equals("snapshot vote_score is 0", snapshot.vote_score, 0);
  TestValidator.equals(
    "snapshot comment_count is 0",
    snapshot.comment_count,
    0,
  );
  TestValidator.equals(
    "snapshot author username matches",
    snapshot.author.username,
    memberUsername,
  );
  TestValidator.equals(
    "snapshot community name matches",
    snapshot.community.name,
    community.name,
  );
  TestValidator.equals(
    "snapshot post reference exists",
    snapshot.post.id,
    post.id,
  );
}
