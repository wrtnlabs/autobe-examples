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
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_file } from "../../../prepare/prepare_random_reddit_community_post_file";

export async function test_api_comment_create_nested_reply(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // Step 2: Create a new post for the member to comment on
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        reddit_community_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        text_content: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // Step 3: Create a top-level comment on the post
  const topLevelComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(topLevelComment);
  // Step 4: Verify top-level comment's post matches the target post
  TestValidator.equals(
    "top-level comment post matches",
    topLevelComment.post.id,
    post.id,
  );
  // Step 5: Verify top-level comment's author matches the authenticated member
  TestValidator.equals(
    "top-level comment author matches member",
    topLevelComment.author.id,
    memberAuth.id,
  );
  // Step 6: Create a reply comment referencing the top-level comment
  const replyComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          redditCommunityCommentId: topLevelComment.id,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(replyComment);
  // Step 7: Verify reply comment's parent references the top-level comment
  TestValidator.equals(
    "reply parent matches top-level comment",
    replyComment.parent?.id,
    topLevelComment.id,
  );
  // Step 8: Verify reply comment's post matches the target post
  TestValidator.equals(
    "reply post matches target",
    replyComment.post.id,
    post.id,
  );
  // Step 9: Verify reply comment's author matches the authenticated member
  TestValidator.equals(
    "reply author matches member",
    replyComment.author.id,
    memberAuth.id,
  );
  // Step 10: Verify thread hierarchy - parent comment has non-null parent reference for the reply
  TestValidator.equals(
    "top-level comment is parent of reply",
    topLevelComment.id,
    replyComment.parent?.id,
  );
}