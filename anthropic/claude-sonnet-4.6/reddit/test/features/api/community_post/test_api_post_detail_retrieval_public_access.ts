import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_post_detail_retrieval_public_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // Step 2: Create a new community using the member's authenticated connection
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // Step 3: Subscribe the member to the community
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // Step 4: Create a text post in the community
  const postTitle = RandomGenerator.paragraph({ sentences: 2 });
  const postBody = RandomGenerator.content({ paragraphs: 1 });
  const post = await api.functional.community.member.communities.posts.create(
    memberConnection,
    {
      communityId: community.id,
      body: {
        title: postTitle,
        type: "text",
        body: postBody,
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // Test execution: Retrieve the post WITHOUT any authentication header
  const publicConnection: api.IConnection = { host: connection.host };
  const retrieved = await api.functional.community.posts.at(publicConnection, {
    postId: post.id,
  });
  typia.assert(retrieved);
  // Validations
  TestValidator.equals("post id matches", retrieved.id, post.id);
  TestValidator.equals("post title matches", retrieved.title, postTitle);
  TestValidator.equals("post type is text", retrieved.type, "text");
  // Validate content is text variant — cast to access discriminator and body
  const content = retrieved.content as { type: string; body: string };
  TestValidator.equals("content type is text", content.type, "text");
  if (content.type === "text") {
    TestValidator.equals(
      "content body matches",
      content.body,
      postBody,
    );
  }
  // Validate author
  TestValidator.equals("author id matches", retrieved.author.id, member.id);
  TestValidator.equals(
    "author username matches",
    retrieved.author.username,
    member.username,
  );
  // Validate community
  TestValidator.equals(
    "community id matches",
    retrieved.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches",
    retrieved.community.name,
    community.name,
  );
  // Validate vote and comment counts
  TestValidator.equals("vote score is 0", retrieved.voteScore, 0);
  TestValidator.equals("comment count is 0", retrieved.commentCount, 0);
  // Validate deletedAt is null (post is active)
  TestValidator.equals(
    "post is active (deletedAt is null)",
    retrieved.deletedAt,
    null,
  );
  // Validate createdAt and updatedAt are equal (no edits)
  TestValidator.equals(
    "createdAt equals updatedAt (no edits)",
    retrieved.createdAt,
    retrieved.updatedAt,
  );
}
