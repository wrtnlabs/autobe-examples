import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
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
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

/**
 * Test creating nested reply comments by specifying parent comment ID.
 * 1. Member registers and authenticates
 * 2. Creates community and subscribes to it
 * 3. Creates a post in the community
 * 4. Creates top-level comment on the post
 * 5. Creates reply comment referencing first comment as parent
 * 6. Validates reply has correct parent_comment_id and parent field
 * 7. Creates third-level reply to verify unlimited nesting depth
 * 8. Validates nested structure is properly maintained throughout
 */
export async function test_api_comment_reply_to_parent_comment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // 2. Create community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      memberConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 4. Create text post
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create top-level comment
  const topLevelComment =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(topLevelComment);
  // 6. Create reply comment (second level)
  const replyComment =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parent_comment_id: topLevelComment.id,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(replyComment);
  // 7. Validate reply has correct parent reference
  TestValidator.equals(
    "reply parent_comment_id matches",
    replyComment.parentComment?.id,
    topLevelComment.id,
  );
  TestValidator.equals(
    "reply parent content matches",
    replyComment.parentComment?.content,
    topLevelComment.content,
  );
  TestValidator.equals(
    "reply parent author matches",
    replyComment.parentComment?.author.id,
    topLevelComment.author.id,
  );
  // 8. Create third-level reply to test unlimited nesting
  const thirdLevelReply =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
          parent_comment_id: replyComment.id,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(thirdLevelReply);
  // 9. Validate third-level reply structure
  TestValidator.equals(
    "third-level parent_comment_id matches",
    thirdLevelReply.parentComment?.id,
    replyComment.id,
  );
  TestValidator.predicate(
    "nested structure maintained",
    thirdLevelReply.parentComment !== null &&
      thirdLevelReply.parentComment !== undefined,
  );
  TestValidator.equals(
    "third-level parent content matches",
    thirdLevelReply.parentComment?.content,
    replyComment.content,
  );
}