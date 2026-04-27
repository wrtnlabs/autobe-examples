import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_subscribers_create } from "../../../generate/generate_random_community_platform_member_communities_subscribers_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_comment_retrieval_with_threaded_reply(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  // 2. Member A creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  // 3. Member A subscribes to the community
  await generate_random_community_platform_member_communities_subscribers_create(
    memberAConnection,
    { params: { communityId: community.id } },
  );
  // 4. Member A creates a text post
  const post = await generate_random_community_platform_member_posts_create(
    memberAConnection,
    {
      body: {
        communityId: community.id,
        type: "text",
        title: RandomGenerator.name(3),
        body: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  // 5. Member A creates a top-level comment (Comment A)
  const commentA =
    await generate_random_community_platform_member_posts_comments_create(
      memberAConnection,
      {
        params: { postId: post.id },
        body: { content: RandomGenerator.paragraph({ sentences: 2 }) },
      },
    );
  // 6. Register Member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  // 7. Member B subscribes to the same community
  await generate_random_community_platform_member_communities_subscribers_create(
    memberBConnection,
    { params: { communityId: community.id } },
  );
  // 8. Member B replies to Comment A, creating Comment B
  const commentB =
    await generate_random_community_platform_member_posts_comments_create(
      memberBConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          commentId: commentA.id,
        },
      },
    );
  // 9. Retrieve Comment A via the public GET endpoint (no auth)
  const retrieved = await api.functional.communityPlatform.posts.comments.at(
    connection,
    {
      postId: post.id,
      commentId: commentA.id,
    },
  );
  typia.assert(retrieved);
  // 10. Validate Comment A fields
  TestValidator.equals("comment id matches", retrieved.id, commentA.id);
  TestValidator.equals("vote score is zero", retrieved.voteScore, 0);
  TestValidator.equals("deletedAt is null", retrieved.deletedAt, null);
  TestValidator.equals(
    "author id matches Member A",
    retrieved.author.id,
    memberA.id,
  );
  // 11. Validate threaded reply
  TestValidator.equals("replies array has 1 item", retrieved.replies.length, 1);
  const reply = retrieved.replies[0];
  TestValidator.equals("reply id matches Comment B", reply.id, commentB.id);
  TestValidator.equals("reply vote score is zero", reply.voteScore, 0);
  TestValidator.equals("reply deletedAt is null", reply.deletedAt, null);
  TestValidator.equals(
    "reply author id matches Member B",
    reply.author.id,
    memberB.id,
  );
  TestValidator.equals("reply has empty replies", reply.replies.length, 0);
}
