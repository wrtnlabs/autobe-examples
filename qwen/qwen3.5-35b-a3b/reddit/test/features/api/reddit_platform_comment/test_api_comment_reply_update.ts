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

export async function test_api_comment_reply_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: "https://test.example.com",
      referrer: "https://test.example.com",
    } satisfies IRedditPlatformMember.IJoin,
  });
  // 2. Create a post for the comment to be attached to
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const post = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        community_id: communityId,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Create a root comment on the post
  const rootComment =
    await api.functional.redditPlatform.member.comments.create(
      memberConnection,
      {
        body: {
          reddit_platform_post_id: post.id,
          content: RandomGenerator.paragraph({ sentences: 2 }),
          reddit_platform_comments_id: null,
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(rootComment);
  // 4. Create a reply comment to the root comment
  const replyComment =
    await api.functional.redditPlatform.member.comments.create(
      memberConnection,
      {
        body: {
          reddit_platform_post_id: post.id,
          content: "Initial reply content",
          reddit_platform_comments_id: rootComment.id,
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(replyComment);
  const rootCommentId = rootComment.id;
  const replyCommentId = replyComment.id;
  const initialUpdatedAt = replyComment.updated_at;
  // Wait to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 5. Update the reply comment
  const newContent = "Updated reply content for testing";
  const updatedReply =
    await api.functional.redditPlatform.member.comments.update(
      memberConnection,
      {
        commentId: replyCommentId,
        body: {
          content: newContent,
        } satisfies IRedditPlatformComment.IUpdate,
      },
    );
  typia.assert(updatedReply);
  // 6. Validate the response contains the full updated reply comment object
  TestValidator.equals("content updated", updatedReply.content, newContent);
  // 7. Verify the updated_at timestamp has changed
  const updateBefore = new Date(initialUpdatedAt);
  const updateAfter = new Date(updatedReply.updated_at);
  TestValidator.predicate("updated_at changed", updateAfter > updateBefore);
  // 8. Verify the reddit_platform_comments_id (parent reference) remains pointing to the root comment
  TestValidator.equals(
    "parent reference stable",
    updatedReply.reddit_platform_comments_id,
    rootCommentId,
  );
  // 9. Verify the parent comment itself was not modified
  // Since we can't fetch the root comment via API (no GET endpoint), we verify
  // that the reply still references the same root comment ID
  TestValidator.equals(
    "root comment ID unchanged",
    replyComment.reddit_platform_comments_id,
    rootCommentId,
  );
  // 10. Verify the updated reply maintains parent relationship
  TestValidator.equals(
    "reply maintains parent relationship",
    updatedReply.reddit_platform_comments_id,
    rootCommentId,
  );
}
