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

export async function test_api_comment_create_root_on_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username:
        RandomGenerator.alphaNumeric(6) + "_" + RandomGenerator.alphaNumeric(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>() as string &
        tags.Format<"uri">,
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  const memberId = memberAuth.id;
  // 2. Create a text post in a community (using a test community ID)
  const testCommunityId = "00000000-0000-0000-0000-000000000001";
  const post = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        community_id: testCommunityId,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Create a root comment on the post (no parent comment)
  const commentBody = {
    reddit_platform_post_id: post.id,
    content: RandomGenerator.paragraph({ sentences: 3 }),
    reddit_platform_comments_id: null,
  } satisfies IRedditPlatformComment.ICreate;
  const comment = await api.functional.redditPlatform.member.comments.create(
    memberConnection,
    {
      body: commentBody,
    },
  );
  typia.assert(comment);
  // 4. Validate comment details
  TestValidator.equals(
    "comment linked to correct post",
    comment.reddit_platform_post_id,
    post.id,
  );
  TestValidator.equals(
    "comment linked to correct member",
    comment.reddit_platform_member_id,
    memberId,
  );
  TestValidator.equals(
    "root comment has no parent",
    comment.reddit_platform_comments_id,
    null,
  );
  TestValidator.equals(
    "content matches input",
    comment.content,
    commentBody.content,
  );
  TestValidator.equals("upvotes initialized to 0", comment.upvotes_count, 0);
  TestValidator.equals(
    "downvotes initialized to 0",
    comment.downvotes_count,
    0,
  );
  TestValidator.equals("score initialized to 0", comment.score, 0);
  TestValidator.equals(
    "post comment_count unchanged",
    comment.post.comment_count,
    0,
  );
  TestValidator.equals("deleted_at is null (active)", comment.deleted_at, null);
  TestValidator.predicate(
    "created_at is set",
    comment.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is set",
    comment.updated_at !== undefined,
  );
  TestValidator.equals("author matches member", comment.author.id, memberId);
  TestValidator.equals(
    "author username matches",
    comment.author.username,
    memberAuth.username,
  );
}