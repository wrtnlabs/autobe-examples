import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformComment";
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

export async function test_api_comment_retrieval_with_replies(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username:
        RandomGenerator.alphaNumeric(6) + "_" + RandomGenerator.alphaNumeric(4),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // Update memberConnection with auth token (done internally by authorize function)
  memberConnection.headers ??= {};
  memberConnection.headers.Authorization = memberAuth.token.access;
  // 2. Create text post in community (assume community exists with known ID)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const post = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        community_id: communityId,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Create parent comment
  const parentComment =
    await api.functional.redditPlatform.member.comments.create(
      memberConnection,
      {
        body: {
          reddit_platform_post_id: post.id,
          content: RandomGenerator.paragraph({ sentences: 3 }),
          reddit_platform_comments_id: null, // root comment
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(parentComment);
  // 4. Create 3 reply comments to the parent
  const createdReplies: IRedditPlatformComment[] = [];
  for (let i = 0; i < 3; i++) {
    const reply = await api.functional.redditPlatform.member.comments.create(
      memberConnection,
      {
        body: {
          reddit_platform_post_id: post.id,
          content: RandomGenerator.paragraph({ sentences: 2 }),
          reddit_platform_comments_id: parentComment.id, // reply to parent
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
    typia.assert(reply);
    createdReplies.push(reply);
  }
  // 5. Retrieve replies for parent comment
  const response = await api.functional.redditPlatform.member.comments.replies(
    memberConnection,
    { commentId: parentComment.id },
  );
  typia.assert(response);
  // 6. Validate pagination structure
  TestValidator.equals("pagination current", response.pagination.current, 1);
  TestValidator.equals("pagination limit", response.pagination.limit, 20);
  TestValidator.equals("pagination records", response.pagination.records, 3);
  TestValidator.equals("pagination pages", response.pagination.pages, 1);
  // 7. Validate replies data
  TestValidator.equals("replies count", response.data.length, 3);
  // 8. Validate each reply comment fields
  for (const [index, reply] of response.data.entries()) {
    typia.assert(reply);
    // Basic fields
    TestValidator.notEquals(`reply ${index} id is UUID`, reply.id, undefined);
    TestValidator.predicate(
      `reply ${index} content not empty`,
      reply.content.length > 0,
    );
    TestValidator.notEquals(
      `reply ${index} author id`,
      reply.author.id,
      undefined,
    );
    TestValidator.notEquals(`reply ${index} post id`, reply.post.id, undefined);
    // Vote metrics
    TestValidator.predicate(
      `reply ${index} score calculated`,
      reply.score === reply.upvotes_count - reply.downvotes_count,
    );
    TestValidator.predicate(
      `reply ${index} upvotes non-negative`,
      reply.upvotes_count >= 0,
    );
    TestValidator.predicate(
      `reply ${index} downvotes non-negative`,
      reply.downvotes_count >= 0,
    );
    TestValidator.predicate(
      `reply ${index} comment_count non-negative`,
      reply.comment_count >= 0,
    );
    // Timestamps
    TestValidator.notEquals(
      `reply ${index} created_at exists`,
      reply.created_at,
      undefined,
    );
    TestValidator.notEquals(
      `reply ${index} updated_at exists`,
      reply.updated_at,
      undefined,
    );
    TestValidator.equals(
      `reply ${index} deleted_at null`,
      reply.deleted_at,
      null,
    );
    // Author reference
    TestValidator.notEquals(
      `reply ${index} author username`,
      reply.author.username,
      undefined,
    );
    TestValidator.predicate(
      `reply ${index} author karma is number`,
      typeof reply.author.karma === "number",
    );
    // Post reference
    TestValidator.notEquals(
      `reply ${index} post title`,
      reply.post.title,
      undefined,
    );
    TestValidator.equals(
      `reply ${index} post type`,
      reply.post.post_type,
      "text",
    );
    // Parent should be null for direct replies (not nested grand-children)
    TestValidator.equals(`reply ${index} parent is null`, reply.parent, null);
  }
  // 9. Validate replies are sorted by created_at ASC (chronological)
  for (let i = 0; i < response.data.length - 1; i++) {
    const currentReply = response.data[i];
    const nextReply = response.data[i + 1];
    TestValidator.predicate(
      `reply ${i + 1} created_at >= reply ${i} created_at`,
      new Date(nextReply.created_at) >= new Date(currentReply.created_at),
    );
  }
  // 10. Validate reply IDs match created replies
  const createdIds = new Set(createdReplies.map((r) => r.id));
  const responseIds = new Set(response.data.map((r) => r.id));
  TestValidator.equals(
    "all reply IDs present",
    createdIds.size,
    responseIds.size,
  );
  for (const id of createdIds) {
    TestValidator.predicate(
      `created reply ${id} exists in response`,
      responseIds.has(id),
    );
  }
}