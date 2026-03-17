import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
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

export async function test_api_comment_delete_with_nested_replies(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member setup - create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Member creates a post
  const postConnection: api.IConnection = { host: connection.host };
  postConnection.headers = {
    Authorization: `Bearer ${memberAuth.token.access}`,
  };
  const post = await generate_random_reddit_community_member_posts_create(
    postConnection,
    {
      body: {
        post_type: "text",
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 4,
          wordMax: 6,
        }),
      },
    },
  );
  typia.assert(post);
  // 3. Create parent comment
  const parentComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      postConnection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 4,
            wordMax: 6,
          }),
        },
      },
    );
  typia.assert(parentComment);
  // 4. Create nested reply (depth 1) to parent comment
  const reply1 =
    await api.functional.redditCommunity.member.posts.comments.create(
      postConnection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 4,
            wordMax: 6,
          }),
          parent_comment_id: parentComment.id,
        },
      },
    );
  typia.assert(reply1);
  // 5. Create nested reply (depth 2) to reply 1
  const reply2 =
    await api.functional.redditCommunity.member.posts.comments.create(
      postConnection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 4,
            wordMax: 6,
          }),
          parent_comment_id: reply1.id,
        },
      },
    );
  typia.assert(reply2);
  // 6. Delete the parent comment (should cascade delete all nested replies)
  await api.functional.redditCommunity.member.posts.comments.erase(
    postConnection,
    {
      postId: post.id,
      commentId: parentComment.id,
    },
  );
}
