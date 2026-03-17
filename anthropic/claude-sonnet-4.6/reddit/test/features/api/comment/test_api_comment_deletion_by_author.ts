import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
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
import { generate_random_community_member_posts_comments_create } from "../../../generate/generate_random_community_member_posts_comments_create";
import { prepare_random_community_comment } from "../../../prepare/prepare_random_community_comment";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_comment_deletion_by_author(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create a new community (member becomes owner automatically)
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // Step 3: Subscribe to the newly created community
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // Step 4: Create a text post in the community
  const post = await api.functional.community.member.communities.posts.create(
    memberConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text",
        body: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // Step 5: Create a top-level comment on the post
  const topLevelComment =
    await generate_random_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
      },
    );
  typia.assert(topLevelComment);
  // Step 6: Create a nested reply referencing the top-level comment as parent_id
  const nestedReply =
    await generate_random_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: { parent_id: topLevelComment.id },
      },
    );
  typia.assert(nestedReply);
  // Test Execution: Delete the top-level comment as its author
  await api.functional.community.member.posts.comments.erase(memberConnection, {
    postId: post.id,
    commentId: topLevelComment.id,
  });
  // Validation 1: Attempting to delete the same comment again should yield 404
  await TestValidator.error(
    "delete already-deleted comment should fail",
    async () => {
      await api.functional.community.member.posts.comments.erase(
        memberConnection,
        {
          postId: post.id,
          commentId: topLevelComment.id,
        },
      );
    },
  );
  // Validation 2: Attempting to delete the cascade-deleted nested reply should also yield 404
  await TestValidator.error(
    "delete cascade-deleted nested reply should fail",
    async () => {
      await api.functional.community.member.posts.comments.erase(
        memberConnection,
        {
          postId: post.id,
          commentId: nestedReply.id,
        },
      );
    },
  );
}
