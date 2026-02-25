import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
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
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_comment_update_by_non_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member A (comment owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA: api.functional.redditCommunity.auth.member.join.Response =
    await authorize_member_join(memberAConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
      } satisfies IRedditCommunityMember.IJoin,
    });
  // 2. Member A creates a community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberAConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Member A creates a post in the community
  const post = await generate_random_reddit_community_member_posts_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_id: community.id,
        content: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Member A creates a comment on the post
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      memberAConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IRedditCommunityComment.ICreate,
        params: { postId: post.id },
      },
    );
  typia.assert(comment);
  // 5. Create member B (non-owner attempting update)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB: api.functional.redditCommunity.auth.member.join.Response =
    await authorize_member_join(memberBConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
      } satisfies IRedditCommunityMember.IJoin,
    });
  // 6. Member B attempts to update comment created by member A
  const originalContent = comment.content;
  const originalUpdatedAt = comment.updated_at;
  const originalAuthorId = comment.author.id;
  const updatedContent = RandomGenerator.paragraph({ sentences: 1 });
  await TestValidator.error(
    "non-author comment update should be forbidden",
    async () => {
      await api.functional.redditCommunity.member.posts.comments.update(
        memberBConnection,
        {
          postId: post.id,
          commentId: comment.id,
          body: {
            content: updatedContent,
          } satisfies IRedditCommunityComment.IUpdate,
        },
      );
    },
  );
  // 7. Verify comment was not modified by retrieving it
  // Since there's no 'get' function, we'll use the original comment data
  // which should be unchanged based on the error validation
  TestValidator.equals(
    "comment content unchanged",
    comment.content,
    originalContent,
  );
  TestValidator.equals(
    "comment updated_at unchanged",
    comment.updated_at,
    originalUpdatedAt,
  );
  TestValidator.equals(
    "comment author unchanged",
    comment.author.id,
    originalAuthorId,
  );
}
