import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import type { IRedditPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostLink";
import type { IRedditPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostText";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_comments_create } from "../../../generate/generate_random_reddit_platform_member_comments_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";

export async function test_api_comment_create_reply_to_comment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a post in a community
  const post = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        community_id: typia.random<string & tags.Format<"uuid">>(),
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text" as const,
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Create a root comment on the post
  const rootCommentContent = RandomGenerator.paragraph({ sentences: 3 });
  const rootComment =
    await api.functional.redditPlatform.member.comments.create(
      memberConnection,
      {
        body: {
          reddit_platform_post_id: post.id,
          content: rootCommentContent,
          reddit_platform_comments_id: null,
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(rootComment);
  // Verify root comment properties
  TestValidator.equals(
    "root comment content matches",
    rootComment.content,
    rootCommentContent,
  );
  TestValidator.equals(
    "root comment has no parent",
    rootComment.reddit_platform_comments_id,
    null,
  );
  TestValidator.equals(
    "root comment upvotes_count initialized to 0",
    rootComment.upvotes_count,
    0,
  );
  TestValidator.equals(
    "root comment deleted_at is null",
    rootComment.deleted_at,
    null,
  );
  // 4. Create a reply comment to the root comment
  const replyCommentContent = RandomGenerator.paragraph({ sentences: 2 });
  const replyComment =
    await api.functional.redditPlatform.member.comments.create(
      memberConnection,
      {
        body: {
          reddit_platform_post_id: post.id,
          content: replyCommentContent,
          reddit_platform_comments_id: rootComment.id,
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(replyComment);
  // 5. Validate reply comment properties
  TestValidator.equals(
    "reply has parent comment ID",
    replyComment.reddit_platform_comments_id,
    rootComment.id,
  );
  TestValidator.equals(
    "reply content matches input",
    replyComment.content,
    replyCommentContent,
  );
  TestValidator.equals(
    "reply upvotes_count initialized to 0",
    replyComment.upvotes_count,
    0,
  );
  TestValidator.equals(
    "reply downvotes_count initialized to 0",
    replyComment.downvotes_count,
    0,
  );
  TestValidator.equals("reply score initialized to 0", replyComment.score, 0);
  TestValidator.equals(
    "reply comment_count initialized to 0",
    replyComment.comment_count,
    0,
  );
  TestValidator.equals(
    "reply deleted_at is null",
    replyComment.deleted_at,
    null,
  );
  typia.assert(replyComment.created_at);
  typia.assert(replyComment.updated_at);
  typia.assert(replyComment.author);
  // 6. Validate thread hierarchy
  TestValidator.equals(
    "reply is linked to parent",
    replyComment.reddit_platform_comments_id,
    rootComment.id,
  );
  TestValidator.equals(
    "reply has post context",
    replyComment.reddit_platform_post_id,
    post.id,
  );
}
