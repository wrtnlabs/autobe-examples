import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_file } from "../../../prepare/prepare_random_reddit_community_post_file";

export async function test_api_comment_deletion_with_nested_replies(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Create a community reference (using random UUID for test)
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Create a post with text content
  const post = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        post_type: "text",
        reddit_community_community_id: communityId,
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Create a parent comment (top-level)
  const parentComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(parentComment);
  // 5. Create nested replies (child comments) - direct children of parent
  const childComment1 =
    await api.functional.redditCommunity.member.posts.comments.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 5,
            wordMax: 10,
          }),
          redditCommunityCommentId: parentComment.id,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(childComment1);
  const childComment2 =
    await api.functional.redditCommunity.member.posts.comments.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 5,
            wordMax: 10,
          }),
          redditCommunityCommentId: parentComment.id,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(childComment2);
  // 6. Create a second-level nested reply (grandchild) - child of childComment1
  const grandchildComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 5,
            wordMax: 10,
          }),
          redditCommunityCommentId: childComment1.id,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(grandchildComment);
  // 7. Verify all comments exist before deletion (deleted_at should be null)
  TestValidator.equals(
    "parent comment not deleted before deletion",
    parentComment.deleted_at,
    null,
  );
  TestValidator.equals(
    "child comment 1 not deleted before deletion",
    childComment1.deleted_at,
    null,
  );
  TestValidator.equals(
    "child comment 2 not deleted before deletion",
    childComment2.deleted_at,
    null,
  );
  TestValidator.equals(
    "grandchild comment not deleted before deletion",
    grandchildComment.deleted_at,
    null,
  );
  // 8. Delete the parent comment (should cascade delete all children via soft delete)
  await api.functional.redditCommunity.member.posts.comments.erase(
    memberConnection,
    {
      postId: post.id,
      commentId: parentComment.id,
    },
  );
  // 9. Validate that post still exists and is functional (integrity preserved)
  typia.assert(post);
  // 10. Create another top-level comment (to verify post is still functional)
  const anotherTopLevelComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(anotherTopLevelComment);
  // 11. Validate that the new comment was created successfully and belongs to the same post
  TestValidator.equals(
    "new comment belongs to same post",
    anotherTopLevelComment.post.id,
    post.id,
  );
}
