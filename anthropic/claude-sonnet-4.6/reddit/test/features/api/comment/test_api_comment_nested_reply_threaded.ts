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

export async function test_api_comment_nested_reply_threaded(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member and get an authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // 2. Create a community
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberConnection,
      { communityId: community.id },
    );
  typia.assert(subscription);
  // 4. Create a post in the community
  const post = await api.functional.community.member.communities.posts.create(
    memberConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        type: "text",
        body: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create a top-level comment (level 1)
  const topLevelComment =
    await generate_random_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: { parent_id: null },
      },
    );
  typia.assert(topLevelComment);
  // Validate level 1 comment
  TestValidator.equals("level1 post_id", topLevelComment.post_id, post.id);
  TestValidator.equals("level1 parent_id", topLevelComment.parent_id, null);
  TestValidator.equals("level1 vote_score", topLevelComment.vote_score, 0);
  TestValidator.equals(
    "level1 created_at equals updated_at",
    topLevelComment.created_at,
    topLevelComment.updated_at,
  );
  // 6. Create a nested reply to the top-level comment (level 2)
  const replyContent = "I agree with your point!";
  const nestedReply =
    await generate_random_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: replyContent,
          parent_id: topLevelComment.id,
        },
      },
    );
  typia.assert(nestedReply);
  // Validate level 2 comment
  TestValidator.notEquals(
    "level2 id differs from level1",
    nestedReply.id,
    topLevelComment.id,
  );
  TestValidator.equals("level2 post_id", nestedReply.post_id, post.id);
  TestValidator.equals(
    "level2 parent_id",
    nestedReply.parent_id,
    topLevelComment.id,
  );
  TestValidator.equals("level2 content", nestedReply.content, replyContent);
  TestValidator.equals("level2 author id", nestedReply.author.id, member.id);
  TestValidator.equals("level2 vote_score", nestedReply.vote_score, 0);
  TestValidator.equals(
    "level2 created_at equals updated_at",
    nestedReply.created_at,
    nestedReply.updated_at,
  );
  // 7. Create a third-level reply (level 3) - verifies unlimited nesting
  const deepReplyContent = "Totally agree with both of you!";
  const deepReply =
    await generate_random_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: deepReplyContent,
          parent_id: nestedReply.id,
        },
      },
    );
  typia.assert(deepReply);
  // Validate level 3 comment
  TestValidator.equals(
    "level3 parent_id equals level2 id",
    deepReply.parent_id,
    nestedReply.id,
  );
  TestValidator.equals("level3 post_id", deepReply.post_id, post.id);
  TestValidator.equals("level3 content", deepReply.content, deepReplyContent);
  TestValidator.equals("level3 vote_score", deepReply.vote_score, 0);
  TestValidator.equals(
    "level3 created_at equals updated_at",
    deepReply.created_at,
    deepReply.updated_at,
  );
}
