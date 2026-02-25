import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_comments_create } from "../../../generate/generate_random_community_platform_user_posts_comments_create";
import { generate_random_community_platform_user_posts_comments_replies_create } from "../../../generate/generate_random_community_platform_user_posts_comments_replies_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_comment_reply_threading_success(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for user
  const userConnection: api.IConnection = { host: connection.host };
  // 1. Authenticate user via join
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userAuth);
  // Update user connection with authorization token
  userConnection.headers = { Authorization: userAuth.token.access };
  // 2. Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create text post within the community
  const post = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: community.name,
        post_type: "text" as const,
        text_content: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Create top-level comment on the post
  const parentComment =
    await generate_random_community_platform_user_posts_comments_create(
      userConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parent_comment_id: null,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(parentComment);
  // 5. Create reply to the parent comment with content within 1-10,000 character limit
  const replyContent = RandomGenerator.paragraph({ sentences: 1 });
  TestValidator.predicate(
    "reply content within character limit",
    replyContent.length >= 1 && replyContent.length <= 10000,
  );
  const reply =
    await generate_random_community_platform_user_posts_comments_replies_create(
      userConnection,
      {
        params: {
          postId: post.id,
          commentId: parentComment.id,
        },
        body: {
          content: replyContent,
          parent_comment_id: parentComment.id,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(reply);
  // 6. Validate reply properties and threading relationship
  TestValidator.equals(
    "reply author matches authenticated user",
    reply.author.id,
    userAuth.id,
  );
  TestValidator.equals(
    "reply post matches original post",
    reply.post.id,
    post.id,
  );
  // The reply endpoint returns ISummary, which doesn't include parent information
  // The threading relationship is established through the parent_comment_id field
  // during creation, which is validated by the server-side logic
  // Validate business logic: reply should have proper content and metadata
  TestValidator.predicate("reply has valid content", reply.content.length > 0);
  TestValidator.predicate(
    "reply has valid creation timestamp",
    new Date(reply.created_at).getTime() > 0,
  );
}
