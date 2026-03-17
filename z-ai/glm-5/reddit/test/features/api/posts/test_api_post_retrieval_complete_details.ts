import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
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
import { generate_random_community_platform_member_communities_posts_create } from "../../../generate/generate_random_community_platform_member_communities_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_post_retrieval_complete_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    },
  });
  typia.assert(memberAuth);
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberAuth.token.access,
    },
  };
  // 2. Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // 3. Create a text post in the community
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      memberConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          postType: "text",
          content: RandomGenerator.paragraph({ sentences: 5 }),
        },
      },
    );
  typia.assert(post);
  // 4. Retrieve the post and validate complete details
  const retrievedPost = await api.functional.communityPlatform.posts.at(
    connection,
    {
      postId: post.id,
    },
  );
  typia.assert(retrievedPost);
  // 5. Validate post fields match expected values
  TestValidator.equals("post id", retrievedPost.id, post.id);
  TestValidator.equals("title", retrievedPost.title, post.title);
  TestValidator.equals("post type", retrievedPost.postType, "text");
  TestValidator.equals("content", retrievedPost.content, post.content);
  TestValidator.equals("vote score", retrievedPost.voteScore, 0);
  TestValidator.equals("comment count", retrievedPost.commentCount, 0);
  TestValidator.equals("deleted at is null", retrievedPost.deletedAt, null);
  // 6. Validate author information
  TestValidator.equals("author id", retrievedPost.author.id, memberAuth.id);
  TestValidator.equals(
    "author username",
    retrievedPost.author.username,
    memberAuth.username,
  );
  // 7. Validate community information
  TestValidator.equals(
    "community id",
    retrievedPost.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name",
    retrievedPost.community.name,
    community.name,
  );
}
