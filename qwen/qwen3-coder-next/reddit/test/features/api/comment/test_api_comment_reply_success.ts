import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_posts_comments_create } from "../../../generate/generate_random_reddit_platform_member_posts_comments_create";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_comment_reply_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminMember = await authorize_member_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(adminMember);
  // 2. Create author connection and join
  const authorConnection: api.IConnection = { host: connection.host };
  const authorMember = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(authorMember);
  // 3. Author creates a post with a community (using generated UUID since no community creation API available)
  const post = await api.functional.redditPlatform.member.posts.create(
    authorConnection,
    {
      body: {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        title: RandomGenerator.paragraph({ sentences: 1 }),
        type: "TEXT",
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Admin creates a comment on the post
  const parentComment =
    await api.functional.redditPlatform.member.posts.comments.create(
      adminConnection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(parentComment);
  // 5. Validate parent comment has no parent (top-level comment)
  if (parentComment.parent_comment_id !== null) {
    throw new Error("parent_comment_id should be null for top-level comment");
  }
  // 6. Admin creates a reply to the parent comment
  const reply =
    await api.functional.redditPlatform.member.posts.comments.create(
      adminConnection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
          parent_comment_id: parentComment.id,
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(reply);
  // 7. Validate reply details
  TestValidator.equals(
    "reply has parent comment ID",
    reply.parent_comment_id,
    parentComment.id,
  );
  TestValidator.notEquals(
    "reply content differs from parent",
    reply.content,
    parentComment.content,
  );
  TestValidator.equals(
    "reply author matches admin",
    reply.author.id,
    adminMember.id,
  );
  TestValidator.predicate("reply vote_score is 0", reply.vote_score === 0);
}
